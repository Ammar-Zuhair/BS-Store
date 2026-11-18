const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

// App-level declarations also override orientation requirements from libraries.
module.exports = config => withAndroidManifest(config, mod => {
  const manifest = mod.modResults.manifest;
  manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  const features = manifest['uses-feature'] || [];
  for (const name of ['android.hardware.screen.portrait', 'android.hardware.screen.landscape']) {
    const feature = features.find(item => item.$['android:name'] === name);
    const attributes = { ...(feature?.$ || {}), 'android:name': name, 'android:required': 'false' };
    const replace = new Set((attributes['tools:replace'] || '').split(',').map(value => value.trim()).filter(Boolean));
    replace.add('android:required');
    attributes['tools:replace'] = [...replace].join(',');
    if (feature) feature.$ = attributes;
    else features.push({ $: attributes });
  }
  manifest['uses-feature'] = features;
  const activity = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
  activity.$['android:screenOrientation'] = 'unspecified';
  activity.$['android:resizeableActivity'] = 'true';
  return mod;
});
