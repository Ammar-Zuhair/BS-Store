const { withGradleProperties } = require('expo/config-plugins');

// Expo's Android settings plugin reads these properties into the version catalog.
module.exports = config => withGradleProperties(config, mod => {
  for (const key of ['android.compileSdkVersion', 'android.targetSdkVersion']) {
    mod.modResults = mod.modResults.filter(item => item.key !== key);
    mod.modResults.push({ type: 'property', key, value: '36' });
  }
  return mod;
});
