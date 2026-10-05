/*
 * BOOSTHIS-OWNED — DO NOT EDIT.
 * This file is vendored from the Boosthis kit. Editing it makes the kit report
 * a tamper mismatch (run `./boosthis verify .`), which can disable the kit on
 * the next entitlement check-in. To change Boosthis, update it via the hosted
 * Boosthis MCP server instead of editing here.
 */
/**
 * Boosthis platform adapter.
 *
 * Boosthis's diagnostic engine (perfMonitor + perfDiagnose) is pure
 * data + math over event rows — but the COLLECTION layer touches
 * three host primitives that differ between runtimes:
 *
 *   1. Persistence (AsyncStorage on RN; localStorage on web; an
 *      in-memory map for unit tests / SSR).
 *   2. JS heap reading (HermesInternal on RN; performance.memory on
 *      Chromium-based browsers; null elsewhere).
 *   3. High-resolution clock (performance.now() everywhere modern;
 *      Date.now() as a last-resort fallback).
 *
 * Routing all three through this small adapter is what makes Boosthis
 * portable to React web, Node, Electron, etc. without any changes
 * to the engine code. See the changelog at the top of perfDiagnose.ts
 * for the full motivation.
 */

export interface PerfStorage {
  get(key: string):              Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string):           Promise<void>;
  /**
   * Every key this store currently holds, when it can say.
   *
   * Optional: AsyncStorage and localStorage can both enumerate, a
   * host-supplied adapter may not. `clearDeviceStorage()` uses it to sweep
   * everything Boosthis-shaped off a device — including keys written by an
   * EARLIER launch, which no in-process bookkeeping could know about. An
   * adapter without it still gets everything this launch touched; see the
   * note there.
   */
  keys?():                       Promise<string[]>;
  /**
   * Does this store KEEP what it is given across process restarts?
   *
   * `true` for AsyncStorage / localStorage, `false` for the in-memory safety
   * net. Optional, and left UNDEFINED by a host-supplied adapter that does not
   * say — callers that accumulate state across launches report "unknown"
   * rather than guessing on the host's behalf.
   */
  persistent?: boolean;
}

export interface PerfPlatform {
  /** Persistence — must be safe to call from anywhere. */
  storage:      PerfStorage;
  /**
   * Current JS heap usage in MB, or null when the runtime doesn't
   * expose it. Heap is best-effort everywhere; the diagnoser
   * gracefully treats null as "no heap signal".
   */
  heapMb():     number | null;
  /** Monotonic clock in ms. Used for frame deltas and event timing. */
  now():        number;
  /** Stable name of the host runtime, e.g. "ios" / "android" / "web". */
  platformName: string;
}

/* ─── Default adapter (auto-detects RN-Hermes vs web) ──────────── */

const memoryFallback: PerfStorage = (() => {
  // Test / SSR safety net: if neither AsyncStorage nor localStorage
  // is available, keep an in-memory map so callers don't crash.
  const m = new Map<string, string>();
  return {
    get:    async (k) => (m.has(k) ? m.get(k)! : null),
    set:    async (k, v) => { m.set(k, v); },
    remove: async (k) => { m.delete(k); },
    keys:   async () => Array.from(m.keys()),
    // Nothing here survives the process — callers must be able to SAY that.
    persistent: false,
  };
})();

function detectStorage(): PerfStorage {
  // 1. React Native — AsyncStorage. We require it lazily so a web
  //    bundle that doesn't install @react-native-async-storage
  //    still works.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@react-native-async-storage/async-storage");
    const AsyncStorage = mod?.default ?? mod;
    if (AsyncStorage?.getItem) {
      return {
        get:    (k) => AsyncStorage.getItem(k),
        set:    (k, v) => AsyncStorage.setItem(k, v),
        remove: (k) => AsyncStorage.removeItem(k),
        keys:   async () => Array.from(await AsyncStorage.getAllKeys()),
        persistent: true,
      };
    }
  } catch {
    // not in an RN runtime — fall through to web
  }
  // 2. Web — localStorage wrapped to a Promise interface.
  const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (ls?.getItem) {
    return {
      get:    async (k) => ls.getItem(k),
      set:    async (k, v) => { ls.setItem(k, v); },
      remove: async (k) => { ls.removeItem(k); },
      keys:   async () => {
        const out: string[] = [];
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          if (typeof k === "string") out.push(k);
        }
        return out;
      },
      persistent: true,
    };
  }
  // 3. Nothing available — stay alive with an in-memory map.
  return memoryFallback;
}

function detectHeapReader(): () => number | null {
  return () => {
    try {
      // Hermes (React Native default). getInstrumentedStats is
      // available in dev when GCEnableInstrumentedStats is on.
      const hermes = (globalThis as unknown as {
        HermesInternal?: { getInstrumentedStats?: () => Record<string, number> };
      }).HermesInternal;
      const stats  = hermes?.getInstrumentedStats?.();
      const bytes  = stats?.js_allocatedBytes ?? stats?.js_heapSize;
      if (typeof bytes === "number") return bytes / (1024 * 1024);
    } catch {
      // fall through
    }
    // Chromium-based browsers expose performance.memory.
    const mem = (globalThis as unknown as {
      performance?: { memory?: { usedJSHeapSize?: number } };
    }).performance?.memory;
    if (typeof mem?.usedJSHeapSize === "number") {
      return mem.usedJSHeapSize / (1024 * 1024);
    }
    return null;
  };
}

function detectPlatformName(): string {
  // React Native exposes Platform.OS — try first.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require("react-native");
    if (rn?.Platform?.OS) return String(rn.Platform.OS);
  } catch {}
  // Browser / Node fallback.
  if (typeof (globalThis as unknown as { document?: object }).document !== "undefined") return "web";
  if (typeof (globalThis as unknown as { process?: { versions?: { node?: string } } }).process?.versions?.node === "string") return "node";
  return "unknown";
}

/**
 * Best-effort detection of the host app's own display name so the dashboard
 * shows a friendly name (e.g. "Rival") instead of a churny per-build install
 * id. Purely optional: it lazily requires Expo's own metadata modules (mirror
 * of the `require(...)` pattern used above), returns `undefined` outside Expo
 * (bare RN, web, tests), and never throws. The returned value is the app's
 * public product name — not PII — but the caller still clamps + PII-screens it
 * before it leaves the device, so auto-detection can NEVER break registration.
 */
export function detectAppName(): string | undefined {
  // 1. expo-constants — the JS-config name (app.json / app.config.*).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-constants");
    const Constants = mod?.default ?? mod;
    const name =
      Constants?.expoConfig?.name ??
      Constants?.manifest2?.extra?.expoClient?.name ??
      Constants?.manifest?.name;
    if (typeof name === "string" && name.trim()) return name.trim();
  } catch {
    // expo-constants not installed — fall through
  }
  // 2. expo-application — the native app display name.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-application");
    const Application = mod?.default ?? mod;
    const name = Application?.applicationName;
    if (typeof name === "string" && name.trim()) return name.trim();
  } catch {
    // expo-application not installed — fall through
  }
  return undefined;
}

/**
 * THE HOST APP'S OWN VERSION, read out of the build rather than asked for.
 *
 * `packageVersion` on every registration this kit has ever sent is the
 * BOOSTHIS KIT's version. The app's own version was never on the wire at all,
 * so a project's release history was empty, a release comparison had nothing
 * to compare, and every surface that showed "the version" was showing one of
 * our releases to somebody looking for one of theirs.
 *
 * Nobody has to declare anything for this to work, which is the whole point:
 * a version that needs remembering is a version that will be wrong. It is read
 * in the order a native build is authoritative:
 *
 *   1. `expo-application.nativeApplicationVersion` — the value actually baked
 *      into the shipped binary: `CFBundleShortVersionString` on iOS,
 *      `versionName` on Android. This is the number the store shows and the
 *      number a person reads off the about screen.
 *   2. `expo-constants.expoConfig.version` — the app config's own `version`,
 *      which is what a managed build puts into the two fields above. Used when
 *      `expo-application` is not installed, and correct for an app whose
 *      JavaScript was updated over the air ahead of its binary.
 *
 * Never throws, never requires either module to be present, and returns
 * `undefined` outside Expo (bare React Native without these packages, web,
 * tests) rather than guessing. An absent answer is reported as an absence:
 * this kit does not fall back to its own version, because putting our version
 * in the customer's field is the exact confusion the reading exists to end.
 */
export function detectAppVersion(): string | undefined {
  // 1. expo-application — the native build's own version string.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-application");
    const Application = mod?.default ?? mod;
    const version = Application?.nativeApplicationVersion;
    if (typeof version === "string" && version.trim()) return version.trim();
  } catch {
    // expo-application not installed — fall through
  }
  // 2. expo-constants — the app config the build was made from.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-constants");
    const Constants = mod?.default ?? mod;
    const version =
      Constants?.expoConfig?.version ??
      Constants?.manifest2?.extra?.expoClient?.version ??
      Constants?.manifest?.version;
    if (typeof version === "string" && version.trim()) return version.trim();
  } catch {
    // expo-constants not installed — fall through
  }
  return undefined;
}

const defaultPlatform: PerfPlatform = {
  storage:      detectStorage(),
  heapMb:       detectHeapReader(),
  now:          () => {
    const p = (globalThis as unknown as { performance?: { now?: () => number } }).performance;
    return typeof p?.now === "function" ? p.now() : Date.now();
  },
  platformName: detectPlatformName(),
};

let active: PerfPlatform = defaultPlatform;

/* ─── THE DURABLE HALF IS GATED ────────────────────────────────────────────
 *
 * A phone's app storage belongs to the person holding the phone, and whether
 * anything may be kept there is the app publisher's call to make on their
 * behalf — see `docs/decisions/end-user-device-storage-consent.md`. Closing
 * the gate routes every read and write into an in-memory map instead, which
 * is the SAME path the kit already takes on a device with no AsyncStorage,
 * so no caller needs a new branch: `persistent` goes false and the honesty
 * surfaces that already read it say what they always said.
 *
 * The flag lives HERE, in the leaf that owns the store, rather than in the
 * module that owns the consent state — a store that had to import the state
 * machine could not be imported BY it, and the kit's cycle guard would
 * (rightly) fail it.
 */

let persistenceAllowed = true;

/** Where writes land while the gate is shut. Not the same map as
 *  `memoryFallback`: that one is the "this device has no store" case, and
 *  keeping them apart means closing the gate cannot spill a value into a
 *  device that does have one, or vice versa. */
const gatedMem = new Map<string, string>();

/** Every Boosthis key this process has written or removed, plus every one an
 *  earlier launch recorded in the ledger below. The sweep list for an adapter
 *  that cannot enumerate — see `clearDeviceStorage()`. */
const touchedKeys = new Set<string>();

/**
 * THE KEY THAT MAKES ERASURE COMPLETE ON A STORE THAT CANNOT ENUMERATE.
 *
 * An adapter without `keys()` — a host-supplied store routed at a file, a
 * database, a server — cannot be asked what it holds. In-process bookkeeping
 * alone would then sweep only what THIS launch wrote, and everything the
 * previous launches put there would stay on the end user's device after they
 * asked for it to be gone. That is not "less complete", it is the promise
 * broken.
 *
 * So a store that cannot enumerate is given one: the names, on the device,
 * beside the entries they name. It is written only when a key is first seen,
 * so the hot path pays nothing after the first write of each key, and it is
 * swept along with everything else (it is `boosthis`-prefixed, and it is
 * removed explicitly even when it is the only thing left).
 *
 * Names only — never values. A ledger holding what was stored would be a
 * second copy of exactly what the gate exists to keep off the device.
 */
const STORED_KEY_LEDGER = "boosthis:storedKeys.v1";

/** Read-the-ledger-once, lazily. `null` means "not read in this process". */
let ledgerRead: Promise<void> | null = null;

/** Merge the names an EARLIER launch wrote into this process's set. Never
 *  throws: a store that cannot answer leaves the set as it stands. */
function loadLedger(store: PerfStorage): Promise<void> {
  if (ledgerRead === null) {
    ledgerRead = (async () => {
      try {
        const raw = await store.get(STORED_KEY_LEDGER);
        if (typeof raw !== "string" || raw === "") return;
        const names: unknown = JSON.parse(raw);
        if (!Array.isArray(names)) return;
        for (const n of names) if (typeof n === "string") touchedKeys.add(n);
      } catch {
        /* an unreadable ledger is one this process cannot improve on */
      }
    })();
  }
  return ledgerRead;
}

/** Write the ledger back, having first merged whatever an earlier launch put
 *  there — overwriting it with only this launch's names would lose exactly
 *  the keys it exists to remember. */
async function persistLedger(store: PerfStorage): Promise<void> {
  try {
    await loadLedger(store);
    const names = Array.from(touchedKeys).filter((k) => k !== STORED_KEY_LEDGER);
    await store.set(STORED_KEY_LEDGER, JSON.stringify(names));
  } catch {
    /* best-effort: a ledger we cannot write is the shortfall, not a crash */
  }
}

/** Names seen since the last ledger write. */
let ledgerDirty = false;
/** The ledger write in flight, or `null`. Awaited before a sweep. */
let ledgerWrite: Promise<void> | null = null;

/**
 * Record the names WITHOUT making the caller wait for it.
 *
 * The ledger is bookkeeping about a write, not the write itself, and awaiting
 * it inside `set()` would put a second full round trip in front of every
 * caller's first write of a key. That is not free: the kit's credential
 * writes are chained, and a store that is slow (a host adapter routed at a
 * file, or a server) would have every one of them wait on a second one. So
 * the value lands first, at the speed it always did, and the names follow.
 *
 * Coalesced: several first-seen keys in a row produce ONE write, and a write
 * that arrives while another is in flight re-runs it rather than queueing a
 * pile of them. A sweep awaits whatever is outstanding before it deletes, so
 * a late ledger cannot survive the erasure that was meant to take it.
 */
function scheduleLedgerPersist(store: PerfStorage): void {
  ledgerDirty = true;
  if (ledgerWrite !== null) return;
  ledgerWrite = (async () => {
    try {
      while (ledgerDirty) {
        ledgerDirty = false;
        await persistLedger(store);
      }
    } finally {
      // No await between the loop's last check and here, so a name recorded
      // in the meantime cannot be dropped between the two.
      ledgerWrite = null;
    }
  })();
}

let gatedView: PerfPlatform | null = null;
let trackingView: PerfPlatform | null = null;

/** An adapter that cannot enumerate needs its writes remembered — in this
 *  process AND on the device, or a later launch's `clearDeviceStorage()` has
 *  nothing to sweep. One that CAN enumerate is handed back untouched: no
 *  wrapper on the hot path, and no ledger, for the stock case. */
function buildTrackingView(base: PerfPlatform): PerfPlatform {
  const inner = base.storage;
  return {
    ...base,
    storage: {
      ...inner,
      get:    (k) => inner.get(k),
      set:    async (k, v) => {
        const firstSeen = !touchedKeys.has(k);
        touchedKeys.add(k);
        await inner.set(k, v);
        // Only on a key's FIRST write, and never for the ledger itself.
        if (firstSeen && k !== STORED_KEY_LEDGER) scheduleLedgerPersist(inner);
      },
      remove: (k) => inner.remove(k),
    },
  };
}

function buildGatedView(base: PerfPlatform): PerfPlatform {
  return {
    ...base,
    storage: {
      // READS do not reach the device either. Gaining access to information
      // already on someone's terminal equipment is the same regulated act as
      // putting it there, so a closed gate is closed in both directions.
      get:    async (k) => (gatedMem.has(k) ? (gatedMem.get(k) as string) : null),
      set:    async (k, v) => { gatedMem.set(k, v); touchedKeys.add(k); },
      remove: async (k) => { gatedMem.delete(k); },
      keys:   async () => Array.from(gatedMem.keys()),
      // The truth, and the whole reason this degrades honestly: a reading
      // that needs state across a launch asks this and goes ABSENT.
      persistent: false,
    },
  };
}

/** Read the active platform adapter. Used internally by perfMonitor.
 *
 *  Hands back a gated view while the end user's permission is not `granted`.
 *  The view is built once and cached, because this is called on hot paths. */
export const platform = (): PerfPlatform => {
  if (!persistenceAllowed) {
    if (gatedView === null) gatedView = buildGatedView(active);
    return gatedView;
  }
  if (typeof active.storage.keys === "function") return active;
  if (trackingView === null) trackingView = buildTrackingView(active);
  return trackingView;
};

/**
 * Open or close the durable half of the store.
 *
 * Never throws: this is a switch, not a request. Closing it does NOT erase —
 * that is `clearDeviceStorage()`, kept separate so a caller that only wants
 * to stop writing cannot delete by accident.
 */
export function setDevicePersistenceAllowed(allowed: boolean): void {
  persistenceAllowed = allowed === true;
  gatedView = null;
  // A fresh scratch space every time the gate moves. Emptied HERE and not in
  // `clearDeviceStorage()`, which is asynchronous: a sweep that also wiped
  // this map could land after a write made while it was in flight and drop a
  // value that was never on the device in the first place.
  gatedMem.clear();
}

/** Is the durable half open? The gate's own answer, which is a DIFFERENT
 *  fact from "this device has a store at all" — a caller that conflates them
 *  cannot tell a visitor who refused from a phone with no AsyncStorage. */
export function isDevicePersistenceAllowed(): boolean {
  return persistenceAllowed;
}

/**
 * Delete every Boosthis-shaped entry from the end user's device.
 *
 * Sweeps by PREFIX rather than removing a list of known keys. A list is
 * hand-kept, and a module that adds a key without adding it to the list
 * leaves that key on a device whose owner asked for it to be gone. The kit's
 * keys are spelled three ways (`boosthis:`, `boosthis.`, `boosthis_`), so the
 * test is the bare word.
 *
 * An adapter that cannot enumerate (`keys` absent — a host-supplied store)
 * is swept from the ledger it has been keeping instead: the name of every key
 * this kit has ever written through it, on the device beside them, merged
 * with whatever this process has touched since. That reaches an EARLIER
 * launch's keys, which in-process bookkeeping alone never could.
 *
 * Returns the number of entries removed. Never throws.
 */
export async function clearDeviceStorage(): Promise<number> {
  const store = active.storage;
  // A ledger write still in flight would land AFTER the sweep and put the
  // names of everything we just deleted back on the device. Let it finish,
  // then stop any further one being scheduled from a name recorded since.
  try {
    await ledgerWrite;
  } catch {
    /* a ledger we could not write is not a reason to skip the sweep */
  }
  ledgerDirty = false;
  let names: string[];
  try {
    if (typeof store.keys === "function") {
      names = await store.keys();
    } else {
      // Everything an earlier launch recorded, everything this one wrote, and
      // the ledger itself — which holds the names of what we are deleting and
      // must not outlive them.
      await loadLedger(store);
      names = [...touchedKeys, STORED_KEY_LEDGER];
    }
  } catch {
    names = [...touchedKeys, STORED_KEY_LEDGER];
  }
  let removed = 0;
  for (const k of names) {
    if (typeof k !== "string" || !k.startsWith("boosthis")) continue;
    try {
      await store.remove(k);
      removed++;
    } catch {
      // A key we cannot remove is reported by not being counted.
    }
  }
  touchedKeys.clear();
  // The ledger on the device has just been removed with everything it named,
  // so the next write starts a fresh one rather than re-reading a key that is
  // no longer there.
  ledgerRead = null;
  return removed;
}

/** @internal Test seam: the ledger write in flight, if any. Production code
 *  never waits for it — see `scheduleLedgerPersist()`. */
export function _storedKeyLedgerSettled(): Promise<void> {
  return ledgerWrite ?? Promise.resolve();
}

/** @internal Test seam: back to an open gate, an empty scratch map and a
 *  ledger this process has not read. */
export function _resetDevicePersistenceForTests(): void {
  persistenceAllowed = true;
  gatedView = null;
  trackingView = null;
  gatedMem.clear();
  touchedKeys.clear();
  ledgerRead = null;
  ledgerDirty = false;
}

/**
 * Override the platform adapter — for tests, for embedding Boosthis in
 * a non-RN/non-web host, or for routing storage through a custom
 * backend (e.g. file system, IndexedDB, SQLite).
 *
 * Pass `null` to restore the auto-detected default.
 */
export function setPerfPlatform(p: PerfPlatform | null): void {
  active = p ?? defaultPlatform;
  // BOTH cached views wrap whatever was active when they were built, so both
  // die with the adapter. Keeping the tracking view alive across a swap was a
  // real defect: the next adapter's `persistent` never reached a caller, and
  // every honesty surface that reads it answered for the PREVIOUS store.
  gatedView = null;
  trackingView = null;
  // The ledger belongs to the store that holds it: a new adapter has its own
  // (or none), and carrying the old one's read across would sweep the new
  // store for keys that were never in it.
  ledgerRead = null;
  ledgerDirty = false;
}
