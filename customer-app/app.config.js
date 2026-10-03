const fs = require('node:fs');

const DEFAULT_API_BASE_URL = 'https://cdt-enlargement-fighting-ide.trycloudflare.com/api';

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

module.exports = ({ config }) => {
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || readEnvFile('EXPO_PUBLIC_EAS_PROJECT_ID') || config.extra?.eas?.projectId;
  const apiBaseUrl = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL) || normalizeApiBaseUrl(readEnvFile('EXPO_PUBLIC_API_URL')) || DEFAULT_API_BASE_URL;
  return {
    ...config,
    name: 'متجر بي اس',
    extra: {
      ...config.extra,
      apiBaseUrl,
      eas: { ...config.extra?.eas, projectId: easProjectId },
    },
  };
};
