#!/usr/bin/env node

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const args = process.argv.slice(2);
const projectRoot = process.cwd();
const projectName = (() => {
  try {
    return require(path.join(projectRoot, 'package.json')).name;
  } catch {
    return null;
  }
})();

const reviewPorts = {
  'customer-app': 8085,
  'admin-app': 8086,
  'courier-app': 8087,
};

const shouldUseCloudflare =
  Object.hasOwn(reviewPorts, projectName) &&
  args[0] === 'start' &&
  args.includes('--tunnel');

let command;
let commandArgs;
let env = process.env;

if (shouldUseCloudflare) {
  command = 'bash';
  commandArgs = [
    path.resolve(projectRoot, '../scripts/start-expo-cloudflare-tunnel.sh'),
    ...args.slice(1).filter((arg) => arg !== '--tunnel'),
  ];
  env = { ...process.env, EXPO_PORT: String(reviewPorts[projectName]) };
} else {
  command = process.execPath;
  commandArgs = [path.join(projectRoot, 'node_modules/expo/bin/cli'), ...args];
}

const result = spawnSync(command, commandArgs, {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
