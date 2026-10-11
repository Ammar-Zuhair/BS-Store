"""Exercise mapping export and its failure conditions without Expo credentials."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location(
    'mapping_export', Path(__file__).resolve().parents[1] / 'scripts/extract-android-mapping.py')
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class MappingExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bundle = self.root / 'customer-app.aab'
        self.manifest = self.root / 'manifest.xml'
        self.manifest.write_text('<manifest xmlns:android="http://schemas.android.com/apk/res/android" '
                                 'package="com.bsstore.customer" android:versionCode="13" '
                                 'android:versionName="1.0.1"/>')

    def bundle_with(self, mapping=None):
        with zipfile.ZipFile(self.bundle, 'w') as archive:
            archive.writestr('base/dex/classes.dex', b'dex-content')
            if mapping is not None:
                archive.writestr('BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map', mapping)

    def test_exports_exact_mapping_with_release_and_hashes(self):
        mapping = '# compiler: R8\ncom.example.Customer -> a.b:\n    void run() -> a\n'
        self.bundle_with(mapping)
        report = export.extract(self.bundle, self.manifest, self.root / 'out')
        self.assertEqual(report['versionCode'], 13)
        self.assertEqual(report['renamedClasses'], 1)
        self.assertEqual(report['uncompressedDexBytes'], len(b'dex-content'))
        self.assertEqual((self.root / 'out' / report['mappingFile']).read_bytes(), mapping.encode())
        self.assertEqual(report['mappingSha256'], hashlib.sha256(mapping.encode()).hexdigest())
        self.assertEqual(report['aabSha256'], hashlib.sha256(self.bundle.read_bytes()).hexdigest())

    def test_missing_mapping_fails_build(self):
        self.bundle_with()
        with self.assertRaisesRegex(ValueError, 'no R8 mapping'):
            export.extract(self.bundle, self.manifest, self.root / 'out')

    def test_no_obfuscation_fails_build(self):
        self.bundle_with('# compiler: R8\ncom.example.Customer -> com.example.Customer:\n')
        with self.assertRaisesRegex(ValueError, 'no renamed classes'):
            export.extract(self.bundle, self.manifest, self.root / 'out')

    def test_other_app_is_rejected(self):
        self.manifest.write_text(self.manifest.read_text().replace('com.bsstore.customer', 'com.bsstore.admin'))
        with self.assertRaisesRegex(ValueError, 'customer app manifest'):
            export.extract(self.bundle, self.manifest, self.root / 'out')

    def test_foreign_mapping_is_rejected(self):
        self.bundle_with('com.example.Customer -> a.b:\n')
        with self.assertRaisesRegex(ValueError, 'R8-generated'):
            export.extract(self.bundle, self.manifest, self.root / 'out')


if __name__ == '__main__':
    unittest.main()
