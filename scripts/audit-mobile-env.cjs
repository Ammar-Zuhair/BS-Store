// Print variable names and paths only. Never print or serialize their values.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const allowed = new Set(['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_EAS_PROJECT_ID']);
let problems = 0;
for (const app of ['admin-app', 'customer-app', 'courier-app']) {
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || ['node_modules', '.git', '.expo', 'dist', 'bin', 'obj'].includes(entry.name)) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) { scan(filename); continue; }
      if (!entry.name.startsWith('.env')) continue;
      const names = [...fs.readFileSync(filename, 'utf8').matchAll(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map(match => match[1]);
      const unexpected = names.filter(name => !allowed.has(name));
      console.log(`${path.relative(root, filename)}: ${names.join(', ') || '(empty)'}`);
      if (unexpected.length) { console.error(`Move to backend or remove: ${unexpected.join(', ')}`); problems++; }
    }
  }
  scan(path.join(root, app));
  const filename = path.join(root, app, 'boosthis.config.json');
  const config = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (config.ingest?.token || config.ingest?.inviteKey || Object.values(config.ingest?.projectKeys || {}).some(Boolean)) {
    console.error(`${app}/boosthis.config.json still contains a service credential`); problems++;
  }
}
if (problems) process.exitCode = 1;
else console.log('PASS mobile dotenv files contain only public API routing and Expo project IDs; no configured Boosthis service keys.');
