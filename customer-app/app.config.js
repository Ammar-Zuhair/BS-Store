const fs = require('node:fs');

function readEnvFile(name) {
  try {
    const contents = fs.readFileSync(`${__dirname}/.env`, 'utf8');
    const match = contents.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*([^\\r\\n#]+)`, 'm'));
    return match?.[1].trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return undefined;
  }
}

function normalizeApiBaseUrl(value) {
  const normalized = value?.trim().replace(/\/+$/, '');
  if (!normalized) return undefined;
  try {
    const url = new URL(normalized);
    const isPrivateHost = /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254(?:\.\d{1,3}){2})$/i.test(url.hostname) || /\.(local|internal)$/i.test(url.hostname);
    if (url.protocol !== 'https:' || isPrivateHost) return undefined;
    return normalized;
  } catch {
    return undefined;
  }
}

function isDevelopmentTunnel(value) {
  try {
    return /(?:^|\.)(?:ngrok(?:-free)?\.(?:app|dev|io)|trycloudflare\.com)$/i.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

const approvedProductionApiHosts = new Set([
  'implosive-exchange-compacter.ngrok-free.dev',
]);

function isApprovedProductionApi(value) {
  try {
    return approvedProductionApiHosts.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

module.exports = ({ config }) => {
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || readEnvFile('EXPO_PUBLIC_EAS_PROJECT_ID') || config.extra?.eas?.projectId;
  if (!easProjectId && (process.env.EAS_BUILD === 'true' || process.env.EAS_BUILD === '1' || process.env.EAS_BUILD_PROFILE)) {
    throw new Error('An existing Expo EAS project ID is required for EAS Update configuration.');
  }
  const configuredApi = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL) || normalizeApiBaseUrl(readEnvFile('EXPO_PUBLIC_API_URL'));
  const isBuild = process.env.EAS_BUILD === 'true' || process.env.EAS_BUILD === '1' || Boolean(process.env.EAS_BUILD_PROFILE);
  const isProductionBuild = process.env.NODE_ENV === 'production' || isBuild;
  // Compatible JS hotfixes may target installed 1.0.0 builds. Native builds
  // continue to use appVersion and must never inherit an OTA-only override.
  const otaRuntime = process.env.BSSTORE_OTA_RUNTIME_VERSION;
  if (otaRuntime && (isBuild || !['1.0.0', '1.0.1'].includes(otaRuntime))) {
    throw new Error('BSSTORE_OTA_RUNTIME_VERSION is only for compatible OTA updates to 1.0.0 or 1.0.1.');
  }
  const apiBaseUrl = configuredApi && (!isProductionBuild || !isDevelopmentTunnel(configuredApi) || isApprovedProductionApi(configuredApi)) ? configuredApi : undefined;
  if (!apiBaseUrl && isProductionBuild) throw new Error('EXPO_PUBLIC_API_URL must be a stable HTTPS API URL for production/EAS builds.');
  const requiredPrivacyReasons = [
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
  ];
  const privacyEntries = new Map();
  for (const entry of [...(config.ios?.privacyManifests?.NSPrivacyAccessedAPITypes || []), ...requiredPrivacyReasons]) {
    const existing = privacyEntries.get(entry.NSPrivacyAccessedAPIType);
    privacyEntries.set(entry.NSPrivacyAccessedAPIType, {
      ...existing,
      ...entry,
      NSPrivacyAccessedAPITypeReasons: Array.from(new Set([...(existing?.NSPrivacyAccessedAPITypeReasons || []), ...(entry.NSPrivacyAccessedAPITypeReasons || [])])),
    });
  }
  return {
    ...config,
    runtimeVersion: otaRuntime || { policy: 'appVersion' },
    updates: {
      ...config.updates,
      ...(easProjectId ? { url: `https://u.expo.dev/${easProjectId}` } : {}),
      enabled: true,
      // Start the embedded bundle first; SystemGate checks for OTA updates after
      // the app is interactive so native update work cannot delay launch.
      checkAutomatically: 'NEVER',
      fallbackToCacheTimeout: 0,
    },
    plugins: Array.from(new Set([...(config.plugins || []), 'expo-secure-store', './plugins/withAndroidApi36'])),
    ios: {
      ...config.ios,
      privacyManifests: {
        ...config.ios?.privacyManifests,
        NSPrivacyAccessedAPITypes: Array.from(privacyEntries.values()),
      },
    },
    name: 'متجر بي اس',
    extra: {
      ...config.extra,
      apiBaseUrl,
      eas: { ...config.extra?.eas, projectId: easProjectId },
    },
  };
};
