const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

// Keep these in a prebuild plugin: generated android/ files are recreated by EAS.
module.exports = config => {
  config = withGradleProperties(config, mod => {
    const properties = {
      'android.enableMinifyInReleaseBuilds': 'true',
      'android.enableShrinkResourcesInReleaseBuilds': 'true',
      'android.enableR8.fullMode': 'true',
      // AGP 8.12 supports the integrated resource/code graph used by AGP 9.
      'android.r8.optimizedResourceShrinking': 'true',
    };
    mod.modResults = mod.modResults.filter(item => !(item.key in properties));
    for (const [key, value] of Object.entries(properties)) {
      mod.modResults.push({ type: 'property', key, value });
    }
    return mod;
  });

  return withAppBuildGradle(config, mod => {
    const defaultRules = /getDefaultProguardFile\((['"])proguard-android(?:-optimize)?\.txt\1\)/g;
    if (!defaultRules.test(mod.modResults.contents)) {
      throw new Error('Cannot find Android default ProGuard rules; review the release optimization configuration.');
    }
    mod.modResults.contents = mod.modResults.contents.replace(
      defaultRules, 'getDefaultProguardFile("proguard-android-optimize.txt")'
    );
    return mod;
  });
};
