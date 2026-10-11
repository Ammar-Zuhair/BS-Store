#!/usr/bin/env python3
"""Verify and export the R8 mapping from the exact AAB being published."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile


def extract(bundle, manifest, output):
    root = ET.parse(manifest).getroot()
    android = '{http://schemas.android.com/apk/res/android}'
    if root.get('package') != 'com.bsstore.customer':
        raise ValueError('Expected the customer app manifest.')
    version = int(root.attrib[android + 'versionCode'])
    entry = 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map'
    with zipfile.ZipFile(bundle) as archive:
        try:
            mapping = archive.read(entry)
        except KeyError:
            raise ValueError('Customer AAB has no R8 mapping. Check release minification.') from None
        contents = mapping.decode('utf-8')
        if '# compiler: R8' not in contents:
            raise ValueError('Expected an R8-generated mapping.')
        compiler_version = re.search(r'^# compiler_version: (.+)$', contents, re.MULTILINE)
        classes = re.findall(r'^([^#\s].*?) -> (.*?):$', contents, re.MULTILINE)
        renamed = sum(original != name for original, name in classes)
        if not renamed:
            raise ValueError('The R8 mapping contains no renamed classes.')
        dex_bytes = sum(info.file_size for info in archive.infolist()
                        if re.fullmatch(r'base/dex/classes\d*\.dex', info.filename))
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    prefix = f'customer-app-v{version}'
    mapping_path = output / f'{prefix}-mapping.txt'
    mapping_path.write_bytes(mapping)
    with Path(bundle).open('rb') as aab_file:
        aab_hash = hashlib.file_digest(aab_file, 'sha256').hexdigest()
    report = {
        'package': root.get('package'),
        'versionCode': version,
        'versionName': root.get(android + 'versionName'),
        'aab': Path(bundle).name,
        'aabSha256': aab_hash,
        'mappingFile': mapping_path.name,
        'mappingSha256': hashlib.sha256(mapping).hexdigest(),
        'r8CompilerVersion': compiler_version[1] if compiler_version else None,
        'mappedClasses': len(classes),
        'renamedClasses': renamed,
        'uncompressedDexBytes': dex_bytes,
        'note': 'Class counts in the mapping are not Google Play optimization percentages.',
    }
    (output / f'{prefix}-r8-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'PASS: R8 mapping for version {version}; {renamed} renamed classes; {dex_bytes} DEX bytes.')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundle', type=Path)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    try:
        extract(args.bundle, args.manifest, args.output)
    except (ValueError, KeyError, zipfile.BadZipFile) as error:
        parser.exit(1, f'ERROR: {error}\n')
