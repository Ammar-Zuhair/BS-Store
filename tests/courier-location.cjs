const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../courier-app/node_modules/typescript');

const values = new Map();
let task, nativeStarted = false, reports = 0, fail = false, now = Date.now();
const options = [];
const location = {
  Accuracy: { Balanced: 3 },
  hasServicesEnabledAsync: async () => true,
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  requestBackgroundPermissionsAsync: async () => ({ status: 'granted' }),
  hasStartedLocationUpdatesAsync: async () => nativeStarted,
  startLocationUpdatesAsync: async (_, config) => { nativeStarted = true; options.push(config); },
  stopLocationUpdatesAsync: async () => { nativeStarted = false; },
  getCurrentPositionAsync: async () => ({ timestamp: now, coords: { latitude: 15, longitude: 44 } }),
};
const mocks = {
  '@react-native-async-storage/async-storage': { getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value), removeItem: async key => values.delete(key) },
  'expo-location': location,
  'expo-task-manager': { defineTask: (_, callback) => { task = callback; }, isAvailableAsync: async () => true },
  'react-native': { Platform: { OS: 'android' } },
  '../api': { api: { initSession: async () => 'test-session' }, driverApi: {
    updateLocation: async () => { reports++; if (fail) throw new Error('offline'); },
  } },
};
const source = ts.transpileModule(fs.readFileSync('/workspace/courier-app/src/location/tracking.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
const exportsObject = {};
class Clock extends Date { static now() { return now; } }
vm.runInNewContext(source, { exports: exportsObject, require: name => {
  if (!mocks[name]) throw new Error(`Unexpected import ${name}`); return mocks[name];
}, Date: Clock });
const fix = () => ({ timestamp: now, coords: { latitude: 15, longitude: 44 } });
(async () => {
  await exportsObject.prepareLocationTracking();
  await exportsObject.startLocationTracking();
  assert.equal(reports, 1); assert.equal(nativeStarted, true);
  assert.equal(options[0].timeInterval, 60_000);
  assert.equal(options[0].foregroundService.killServiceOnDestroy, false);
  await Promise.all([exportsObject.publishCurrentLocation(), task({ data: { locations: [fix()] } })]);
  assert.equal(reports, 1, 'native and foreground reports share the throttle');
  now += 60_000;
  await task({ data: { locations: [fix()] } }); assert.equal(reports, 2);
  await exportsObject.stopLocationTracking();
  now += 60_000;
  await task({ data: { locations: [fix()] } }); assert.equal(reports, 2);
  assert.equal(nativeStarted, false);
  fail = true;
  await assert.rejects(exportsObject.startLocationTracking());
  assert.equal(nativeStarted, true, 'network failure retains the background task');
  assert.equal(reports, 3);
  await task({ data: { locations: [fix()] } }); assert.equal(reports, 3, 'failed requests never burst retry');
  fail = false; now += 60_000;
  await task({ data: { locations: [fix()] } }); assert.equal(reports, 4, 'next minute retries after reconnect');
  now += 60_000;
  await task({ data: { locations: [{ ...fix(), timestamp: now - 180_000 }] } }); assert.equal(reports, 4);
  await exportsObject.stopLocationTracking();
  location.requestForegroundPermissionsAsync = async () => ({ status: 'denied' });
  await assert.rejects(exportsObject.prepareLocationTracking());
  console.log('PASS courier GPS permissions, minute cadence, overlapping callbacks, offline stop, stale fixes and network recovery');
})().catch(error => { console.error(error); process.exitCode = 1; });
