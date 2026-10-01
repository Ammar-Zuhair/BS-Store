const base = require('./app.json');

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    extra: {
      ...base.expo.extra,
      eas: { ...base.expo.extra?.eas, projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID },
    },
  },
};
