const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();
const projectName = require(path.join(projectRoot, 'package.json')).name;
const supportedProjects = new Set(['customer-app', 'admin-app', 'courier-app']);

if (!supportedProjects.has(projectName)) {
  process.exit(0);
}

const expoBin = path.join(projectRoot, 'node_modules/.bin/expo');
const expoCli = path.join(projectRoot, 'node_modules/expo/bin/cli');
const wrapper = path.resolve(projectRoot, '../scripts/expo-cli-wrapper.js');

if (!fs.existsSync(expoBin) || !fs.existsSync(expoCli)) {
  console.error(`Cannot install the Expo Cloudflare wrapper for ${projectName}: Expo CLI is missing.`);
  process.exit(1);
}

let currentTarget;
try {
  currentTarget = fs.realpathSync(expoBin);
} catch (error) {
  console.error(`Cannot resolve ${expoBin}: ${error.message}`);
  process.exit(1);
}

if (currentTarget === fs.realpathSync(wrapper)) {
  process.exit(0);
}

if (currentTarget !== fs.realpathSync(expoCli)) {
  console.error(`Skipping Expo wrapper: ${expoBin} does not point to this project's Expo CLI.`);
  process.exit(1);
}

fs.unlinkSync(expoBin);
fs.symlinkSync(path.relative(path.dirname(expoBin), wrapper), expoBin);
