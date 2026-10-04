/*
 * BOOSTHIS-OWNED — DO NOT EDIT.
 * This file is vendored from the Boosthis kit. Editing it makes the kit report
 * a tamper mismatch (run `./boosthis verify .`), which can disable the kit on
 * the next entitlement check-in. To change Boosthis, update it via the hosted
 * Boosthis MCP server instead of editing here.
 */
/* ─── Boosthis: privacy-safe crash reporter ──────────────────────────
 *
 * Captures REAL uncaught crashes from the host app and turns each one into a
 * tiny, scrubbed fingerprint that is safe to send off-device. This is NOT a
 * perf checklist rule — it is a separate always-on channel (for registered
 * apps) that mirrors the candidate/resolution model: install it once from
 * `enableTelemetry`, and the runtime reports on its own. Nothing here runs as
 * an import side-effect; `installCrashHandlers()` must be called explicitly.
 *
 * Fatal capture, always CHAINED so Boosthis never replaces host behavior:
 *   1. `ErrorUtils.setGlobalHandler` — isFatal:true JS errors. We wrap the previous
 *      handler and ALWAYS call it afterwards (the app's own crash flow is
 *      untouched; if RN's red box / the host's reporter ran before, it still
 *      runs).
 *   2. Non-fatal `addEventListener("unhandledrejection", …)` when available (Expo web /
 *      Hermes builds that expose it). This is an ADDITIVE listener — multiple
 *      listeners coexist and we never `preventDefault()`, so default handling
 *      proceeds. On native runtimes without `addEventListener` we deliberately
 *      do NOT hook the promise rejection tracker, because enabling it would
 *      replace RN's own dev tracker — a drop-in kit must not change host
 *      behavior. Uncaught errors still flow through source (1).
 *   3. `reportRenderError()` is non-fatal: a boundary already caught it.
 * Rejections and boundary errors are never kept, sent or counted as crashes.
 *
 * PRIVACY: the DEFAULT payload carries only the error type, a hashed signature,
 * a redacted top frame, and a bucketed count — never source, values, or PII.
 * OPT-IN detailed mode (per app) additionally carries a PII-scrubbed first
 * message line (`summary`) and sanitized stack `frames` (function + file
 * BASENAME + line/col — absolute paths, URLs, query strings and arguments are
 * stripped on-device). `summary` and any frame that trips the PII guard are
 * dropped individually so the rest of the crash still reports. The field names
 * deliberately avoid the PII denylist (no `message`/`text`/`body`).
 *
 * Crash-safety: every entry point is wrapped in `safe.ts` so a bug in the
 * reporter itself can never crash the host. The capture/flush path persists
 * pending crashes to platform storage, and the fatal handler holds the host's
 * own handler (up to 1.5s) until that write is done. React Native storage is
 * asynchronous: a process exit that interrupts the write loses the crash, so
 * next-launch replay covers only writes the platform actually completed.
 */

import { isBoosthisDisabled } from "./runtimeFlags";
import { currentAction, newSpanId } from "./spanScope";
import { checkNoPII, routeLabelHasPII } from "./no-pii";
import { currentScreen } from "./screenAttribution";
import { safeScreenName } from "./routeInventory";
import { subscribeEntitlement, isRuntimeInert } from "./killSwitch";
import { bankFatalCrash } from "./watchHistory";
import { platform } from "./perfPlatform";
import { safeRun, safeAsync } from "./safe";
import { windowMinOf } from "./rateHonesty";

const STORAGE_KEY = "boosthis:crash-pending:v2";
const LEGACY_KEY = "boosthis:crash-pending:v1";
/** Bound the in-memory + persisted crash set so a pathological app that throws
 *  a unique error class on every frame can never grow memory/storage without
 *  limit. Distinct crash SIGNATURES (not crash frequency) are what counts. */
const MAX_CRASHES = 200;
/** Server caps a batch at 50 reports (CrashBatch.maxItems). */
const MAX_BATCH = 50;
/** Server caps a single signature's occurrences at 100000. */
const MAX_OCCURRENCES = 100000;
/** Server caps detailed frames at 20 (CrashReport.frames.maxItems). */
const MAX_FRAMES = 20;

export type CrashKind = "uncaught" | "unhandledRejection" | "render";

/** One sanitized stack frame (opt-in detailed mode only). */
export interface CrashFrameData {
  func: string;
  file: string;
  line?: number;
  column?: number;
}

/** Privacy-safe crash fingerprint. Shape matches the OpenAPI `CrashReport`
 *  schema. NEVER carries source code, user values, or PII. */
export interface CrashReportPayload {
  occurredAt?: number;
  routeLabel?: string;
  partUnknown?: "no-part-open" | "part-refused" | "part-not-tracked";
  signature: string;
  errorName: string;
  kind: CrashKind;
  redactedFrame: string;
  countBucket: string;
  occurrences: number;
  /** OPT-IN ONLY. PII-scrubbed first message line. */
  summary?: string;
  /** OPT-IN ONLY. Sanitized stack frames. */
  frames?: CrashFrameData[];
  /** The ACTION this crash happened in: the 32-hex trace id, and the 16-hex
   *  id of the call that was open. Both are omitted when the kit held no
   *  action at that moment — an omitted key means "no action recorded", which
   *  is not the same as "happened outside any action", and the server never
   *  invents one. Neither is screen-bearing: both are random correlation tags
   *  and neither can carry a value from the app. */
  traceId?: string;
  spanId?: string;
}

/** Network submitter wired by the telemetry client (→ `transmitCrashes`).
 *  Registered on `enableTelemetry`, cleared on `forget()`. */
export type CrashSubmitter = (
  crashes: readonly CrashReportPayload[],
  deliveryId?: string,
  installId?: string,
) => Promise<number>;

interface CrashEntry {
  firstAt?: number;
  routeLabel?: string;
  partUnknown?: CrashReportPayload["partUnknown"];
  signature: string;
  errorName: string;
  kind: CrashKind;
  redactedFrame: string;
  summary?: string;
  frames?: CrashFrameData[];
  /** The action the LAST occurrence of this signature happened in, when one
   *  was open. Absent means no occurrence has been able to name one. */
  traceId?: string;
  spanId?: string;
  /** Lifetime occurrences observed (across restored sessions); drives the
   *  bucketed count. */
  sessionTotal: number;
  /** Occurrences not yet acknowledged by the server (the delta the device
   *  sends; the server ADDS it to the row's lifetime total). */
  unsent: number;
  lastSeen: number;
}

let activeSubmitter: CrashSubmitter | null = null;
let identity: () => string = () => "";
interface SealedBatch { deliveryId: string; installId: string; sealedAt: number; crashes: (CrashReportPayload & { firstAt?: number })[] }
let sealed: SealedBatch[] = [];
let memoryOnly = false;
let crashMoments: number[] = [];
let unsubscribeEntitlement: (() => void) | undefined;
let epoch = 0;
let serial: Promise<unknown> = Promise.resolve();
// Every storage write already handed to the platform adapter. Erasure waits
// for THESE (never for a pending read), so a write admitted before forget()
// cannot land after the removal, and a slow read cannot hold forget() open.
let writeTail: Promise<unknown> = Promise.resolve();
function admit<T>(write: Promise<T>): Promise<T> {
  writeTail = Promise.all([writeTail, write.catch(() => {})]);
  return write;
}
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryStep = 0;
const said = new Set<string>();
function say(key: string, text: string): void {
  if (said.has(key)) return;
  said.add(key);
  try { console.warn(`[boosthis] ${text}`); } catch { /* guest */ }
}
function writeFailure(): void {
  say("write", "A crash was captured but could not be written to disk, so it will not survive this process. Check that the Boosthis state directory is writable.");
}
function retry(restart = false): void {
  if (restart) { clearTimeout(retryTimer); retryTimer = undefined; retryStep = 0; }
  if (retryTimer || !active) return;
  const delays = [5000, 30000, 120000, 600000, 1800000];
  retryTimer = setTimeout(() => { retryTimer = undefined; void flush(); retry(); }, delays[Math.min(retryStep++, 4)]);
  (retryTimer as unknown as { unref?: () => void }).unref?.();
}
function change(fn: () => void | Promise<void>): Promise<void> {
  // A change queued in one lifetime never runs, or writes, in the next one.
  const started = epoch;
  const work = serial.then(async () => {
    if (started !== epoch) return;
    await restore(true);
    if (started !== epoch) return;
    await fn();
    if (started !== epoch) return;
    await persist();
  });
  serial = work.catch(() => { writeFailure(); });
  return serial as Promise<void>;
}
let active = false;
let detailedMode = false;
let prevGlobalHandler: ((error: unknown, isFatal?: boolean) => void) | null =
  null;
let rejectionListener: ((event: unknown) => void) | null = null;
let restoredOnce = false;
/** Count of crashes captured this session (uncaught / unhandledRejection /
 *  render). Read by the crashFree meter axis; zeroed on forget()/reset. */
let crashTotal = 0;
/** Wall-clock (Date.now()) when the crash hook was installed — the crashFree
 *  axis's observation-window origin. 0 until installed; cleared on forget/reset. */
let telemetryStartedAt = 0;

const pending = new Map<string, CrashEntry>();

/** Register the crash auto-submitter. Pass `null` to clear (on opt-out). */
export function setCrashSubmitter(submitter: CrashSubmitter | null, installId?: () => string): void {
  activeSubmitter = submitter;
  if (installId) identity = installId;
  if (submitter && active) scheduleFlush();
}

export function offerKeptCrashes(): void { scheduleFlush(); }

/* ─── Redaction helpers ──────────────────────────────────────────── */

/** Cheap stable djb2 hash. Input is already redacted/non-reversible content;
 *  the output is used purely to GROUP identical crash classes — it carries no
 *  recoverable user data. */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Coarse, privacy-safe occurrence bucket. Always <= 12 chars (server cap). */
function bucketCount(n: number): string {
  if (n <= 1) return "1";
  if (n <= 5) return "2-5";
  if (n <= 20) return "6-20";
  if (n <= 100) return "21-100";
  return "100+";
}

/** Reduce a possibly-non-Error throw to an Error-like shape. */
function toError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (error && typeof error === "object") {
    const o = error as { name?: unknown; message?: unknown; stack?: unknown };
    return {
      name: typeof o.name === "string" ? o.name : "Error",
      message: typeof o.message === "string" ? o.message : String(error),
      stack: typeof o.stack === "string" ? o.stack : undefined,
    };
  }
  return { name: "Error", message: typeof error === "string" ? error : String(error) };
}

/** Keep only identifier characters so an error NAME can never carry an
 *  email/path/URL/value. Class names are code-defined; anything else is
 *  collapsed to "Error". */
function sanitizeErrorName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_$]/g, "").slice(0, 80);
  return cleaned.length > 0 ? cleaned : "Error";
}

/** Reduce a file path/URL to its bare basename, dropping directories, URL
 *  scheme/host, query strings, and fragments. */
function fileBasename(raw: string): string {
  let s = raw;
  const q = s.search(/[?#]/);
  if (q >= 0) s = s.slice(0, q);
  // Normalize both separators, take the last segment.
  const segs = s.split(/[\\/]/);
  s = segs[segs.length - 1] ?? "";
  s = s.trim().slice(0, 120);
  return s.length > 0 ? s : "<unknown>";
}

interface RawFrame {
  func: string;
  file: string;
  line?: number;
  column?: number;
}

/** Parse a JS error stack into frames, handling both the V8/Hermes
 *  ("at fn (file:line:col)" / "at file:line:col") and JSC/Safari
 *  ("fn@file:line:col") formats. File paths are reduced to basenames here so
 *  no absolute path or URL ever survives parsing. */
function parseStack(stack: string | undefined): RawFrame[] {
  if (!stack || typeof stack !== "string") return [];
  const frames: RawFrame[] = [];
  const lines = stack.split("\n");
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    let func = "<anonymous>";
    let loc = "";
    const v8 = line.match(/^at\s+(.*?)\s+\((.*)\)$/);
    if (v8) {
      func = v8[1] ?? "<anonymous>";
      loc = v8[2] ?? "";
    } else {
      const v8NoFn = line.match(/^at\s+(.*)$/);
      const jsc = line.match(/^(.*?)@(.*)$/);
      if (v8NoFn) {
        loc = v8NoFn[1] ?? "";
      } else if (jsc) {
        func = jsc[1] && jsc[1].length > 0 ? jsc[1] : "<anonymous>";
        loc = jsc[2] ?? "";
      } else {
        continue;
      }
    }
    // loc is "<path>:<line>:<col>" — split trailing :line:col off the path.
    let file = loc;
    let lineNo: number | undefined;
    let colNo: number | undefined;
    const m = loc.match(/^(.*):(\d+):(\d+)$/) ?? loc.match(/^(.*):(\d+)$/);
    if (m) {
      file = m[1] ?? loc;
      lineNo = clampInt(m[2]);
      colNo = m[3] !== undefined ? clampInt(m[3]) : undefined;
    }
    func = func.replace(/[^A-Za-z0-9_$.<>\s]/g, "").trim().slice(0, 120);
    if (func.length === 0) func = "<anonymous>";
    frames.push({ func, file: fileBasename(file), line: lineNo, column: colNo });
    if (frames.length >= MAX_FRAMES) break;
  }
  return frames;
}

function clampInt(s: string): number | undefined {
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(n, 100_000_000);
}

function formatRedactedFrame(top: RawFrame | undefined): string {
  if (!top) return "<unknown>";
  const lineSuffix = top.line !== undefined ? `:${top.line}` : "";
  return `${top.func} (${top.file}${lineSuffix})`.slice(0, 160);
}

/** First line of the error message, scrubbed: dropped entirely if it trips the
 *  PII guard (email/JWT/bearer/IP/phone). Returns undefined when there is
 *  nothing safe to keep. */
function sanitizeSummary(message: string): string | undefined {
  const first = message.split(/\r?\n/)[0]?.trim().slice(0, 300);
  if (!first) return undefined;
  if (checkNoPII(first) !== null) return undefined;
  return first;
}

interface RedactedCrash {
  signature: string;
  errorName: string;
  kind: CrashKind;
  redactedFrame: string;
  summary?: string;
  frames?: CrashFrameData[];
}

/** Turn a raw throw into the closed, PII-safe crash shape. Detailed fields are
 *  added only when `detailedMode` is on and they pass the PII guard. */
function redactError(error: unknown, kind: CrashKind): RedactedCrash {
  const err = toError(error);
  const errorName = sanitizeErrorName(err.name);
  const frames = parseStack(err.stack);
  const top = frames[0];
  const redactedFrame = formatRedactedFrame(top);
  // The signature is ALWAYS sent (even in default mode), so its basis must never
  // contain user values. A redacted top frame is code-defined (function + file
  // basename + line) and safe; when there is NO frame (stackless Error or a
  // non-Error throw) we fall back to ONLY code-defined tokens — the sanitized
  // error name, the crash kind, and a constant marker — and NEVER the raw error
  // message, which could carry an email/token/user value that would otherwise
  // leave the device as a deterministic hash.
  const basis = top ? redactedFrame : `${errorName}|${kind}|<no-frame>`;
  const signature = `${errorName}:${hash(basis)}`.slice(0, 120);
  const out: RedactedCrash = { signature, errorName, kind, redactedFrame };
  if (detailedMode) {
    const summary = sanitizeSummary(err.message);
    if (summary) out.summary = summary;
    // Drop any individual frame that trips the PII guard rather than the whole
    // crash; func/file are sanitized above, so this is belt-and-braces.
    const safeFrames = frames
      .slice(0, MAX_FRAMES)
      .filter((f) => checkNoPII(f) === null)
      .map((f) => {
        const fr: CrashFrameData = { func: f.func, file: f.file };
        if (f.line !== undefined) fr.line = f.line;
        if (f.column !== undefined) fr.column = f.column;
        return fr;
      });
    if (safeFrames.length > 0) out.frames = safeFrames;
  }
  return out;
}

/* ─── Capture + flush ────────────────────────────────────────────── */

/** Record one crash. Idempotent-safe and never throws (wrapped by callers and
 *  guarded internally). No-op until `installCrashHandlers()` has run, so the
 *  reporter has zero effect on apps that never enabled telemetry. */
function capture(error: unknown, kind: CrashKind): Promise<void> {
  if (!active || isBoosthisDisabled() || kind !== "uncaught") return Promise.resolve();
  try {
    const r = redactError(error, kind);
    const now = Math.floor(Date.now());
    const at = currentAction();
    // BOOSTHIS_FAILURE_PART_V1: read the navigation attribution at capture.
    const screen = currentScreen();
    const part: Pick<CrashEntry, "routeLabel" | "partUnknown"> = screen === null
      ? { partUnknown: "no-part-open" }
      : safeScreenName(screen) !== null && routeLabelHasPII(screen) === null
        ? { routeLabel: screen } : { partUnknown: "part-refused" };
    crashTotal += 1;
    crashMoments.push(now);
    // WHICH ACTION THIS HAPPENED IN, when the kit actually holds one. Read
    // from the ambient span scope, which is synchronous by design, so it can
    // only ever name a call genuinely open on this stack — a render throw
    // inside a scoped action, typically. A crash arriving from an async
    // callback has no scope open and this is null: reported as "no action
    // recorded", never guessed at from whatever fetch happened to be in
    // flight.
    retry(true);
    return change(async () => {
    const existing = pending.get(r.signature);
    if (existing) {
      existing.sessionTotal = Math.min(existing.sessionTotal + 1, MAX_OCCURRENCES);
      existing.unsent = Math.min(existing.unsent + 1, MAX_OCCURRENCES);
      existing.kind = r.kind;
      existing.errorName = r.errorName;
      existing.redactedFrame = r.redactedFrame;
      existing.lastSeen = now;
      existing.routeLabel = part.routeLabel;
      existing.partUnknown = part.partUnknown;
      if (r.summary !== undefined) existing.summary = r.summary;
      if (r.frames !== undefined) existing.frames = r.frames;
      // A later occurrence that DOES know its action names it; one that does
      // not leaves the last known action alone rather than wiping it. Same
      // rule the server applies when it merges reports of one signature.
      if (at !== null) {
        existing.traceId = at.traceId;
        existing.spanId = at.spanId;
      }
    } else {
      pending.set(r.signature, {
        signature: r.signature,
        errorName: r.errorName,
        kind: r.kind,
        redactedFrame: r.redactedFrame,
        summary: r.summary,
        frames: r.frames,
        sessionTotal: 1,
        unsent: 1,
        lastSeen: now,
        firstAt: now,
        ...part,
        ...(at !== null ? { traceId: at.traceId, spanId: at.spanId } : {}),
      });
      evictIfNeeded();
    }
    // Persist immediately so a FATAL crash that kills the process before the
    // network flush completes is still reported on the next launch.
    await admit(bankFatalCrash(now, crashTotal, crashWindowMs())).catch(writeFailure);
    });
  } catch { return Promise.resolve(); }
}

/** Public entry for `BoosthisErrorBoundary` render throws (SDK-internal). */
export function reportRenderError(error: unknown): void {
  void error; // A boundary caught it: not a crash.
}

/** Keep the crash set bounded: evict the least-recently-seen entries that have
 *  nothing left to send. */
function evictIfNeeded(): void {
  if (pending.size <= MAX_CRASHES) return;
  const sortable = [...pending.values()].sort((a, b) => a.lastSeen - b.lastSeen);
  for (const e of sortable) {
    if (pending.size <= MAX_CRASHES) break;
    if (e.unsent <= 0) pending.delete(e.signature);
  }
  // Unaccepted occurrences are never evicted to make room.
}

let flushing = false;
let flushQueued = false;

function scheduleFlush(): void {
  safeAsync("boosthis.crash.flush", () => flush());
}

function buildBatch(): CrashReportPayload[] {
  const batch: CrashReportPayload[] = [];
  for (const e of pending.values()) {
    if (e.unsent <= 0) continue;
    const item: CrashReportPayload = {
      signature: e.signature,
      errorName: e.errorName,
      kind: e.kind,
      redactedFrame: e.redactedFrame,
      countBucket: bucketCount(e.sessionTotal),
      occurrences: Math.min(e.unsent, MAX_OCCURRENCES),
      occurredAt: e.lastSeen,
      ...(e.routeLabel ? { routeLabel: e.routeLabel } : { partUnknown: e.partUnknown ?? "part-not-tracked" }),
    };
    if (e.summary !== undefined) item.summary = e.summary;
    if (e.frames !== undefined) item.frames = e.frames;
    // Added only when present: a crash the kit could not place in an action
    // sends the keys it always did, and the server reads that as "no action
    // recorded" rather than as an action of its own.
    if (e.traceId !== undefined) item.traceId = e.traceId;
    if (e.spanId !== undefined) item.spanId = e.spanId;
    batch.push(item);
    if (batch.length >= MAX_BATCH) break;
  }
  return batch;
}

/** Flush pending crashes through the registered submitter. Always-on for
 *  registered apps (not gated by enable/disable) — only `BOOSTHIS_DISABLED`,
 *  `forget()`, or a missing submitter stop it. Never throws. */
async function flush(): Promise<void> {
  if (flushing) {
    flushQueued = true;
    return;
  }
  if (!activeSubmitter || isBoosthisDisabled()) return;
  const started = epoch;
  flushing = true;
  try {
    await change(() => {
      const cutoff = Date.now() - 30 * 86400000;
      let count = 0, oldest = Infinity;
      const expired = (at: number, n: number) => { count += n; oldest = Math.min(oldest, at); };
      for (const e of pending.values()) if (e.lastSeen < cutoff) { expired(e.lastSeen, e.unsent); pending.delete(e.signature); }
      sealed = sealed.flatMap(b => {
        const crashes = b.crashes.filter(c => {
          if ((c.occurredAt ?? 0) >= cutoff) return true;
          expired(c.occurredAt ?? 0, c.occurrences); return false;
        });
        return crashes.length ? [{ ...b, crashes }] : [];
      });
      if (count) {
        const day = new Date(oldest).toISOString().slice(0, 10);
        say("expired", count === 1
          ? `1 crash occurrence this app kept was older than the 30 days Boosthis keeps crash receipts for, so it was not sent and has been removed. It happened on ${day}.`
          : `${count} crash occurrences this app kept were older than the 30 days Boosthis keeps crash receipts for, so they were not sent and have been removed. The oldest happened on ${day}.`);
      }
      const installId = identity();
      if (!installId) return;
      while (buildBatch().length) {
        const crashes = buildBatch().map(c => ({ ...c, firstAt: pending.get(c.signature)?.firstAt ?? c.occurredAt }));
        const deliveryId = newSpanId() + newSpanId() + newSpanId() + newSpanId();
        sealed.push({ deliveryId, installId, sealedAt: Date.now(), crashes });
        for (const c of crashes) pending.delete(c.signature);
      }
    });
    for (const batch of [...sealed]) {
      if (started !== epoch || !activeSubmitter) return;
      let status = 0;
      if (batch.installId !== identity()) status = 401;
      else try { status = await activeSubmitter(batch.crashes.map(({ firstAt: _firstAt, ...c }) => c), batch.deliveryId, batch.installId); } catch { /* held */ }
      if (started !== epoch) return;
      if (status >= 200 && status < 300) {
        await change(() => { sealed = sealed.filter(b => b.deliveryId !== batch.deliveryId); });
      } else {
        const reason = status === 0 ? "unreachable" : status === 404 ? "not-registered"
          : status === 401 || status === 403 ? "credential-refused" : status === 429 ? "rate-limited"
          : [400, 413, 422].includes(status) ? "rejected" : status >= 500 ? "server-error" : "unknown";
        const texts = { unreachable: "Boosthis could not be reached", "not-registered": "this install is not registered with Boosthis", "credential-refused": "this install's credential was refused", "rate-limited": "Boosthis is rate-limiting this install", rejected: "Boosthis rejected the report", "server-error": "Boosthis answered with an error", unknown: "Boosthis did not accept it and gave no reason we recognise" };
        const n = batch.crashes.reduce((sum, c) => sum + c.occurrences, 0);
        say(reason, `Boosthis did not accept ${n} crash ${n === 1 ? "occurrence" : "occurrences"} this app reported: ${texts[reason]}. They are still held and will be offered again; until they are accepted this project's crash count is lower than the truth.`);
      }
    }
  } finally {
    // A new lifetime may already have its own flush in flight.
    if (started !== epoch) return;
    flushing = false;
    if (flushQueued) {
      flushQueued = false;
      scheduleFlush();
    }
  }
}

/* ─── Persistence ────────────────────────────────────────────────── */

async function persist(): Promise<void> {
  const started = epoch;
  try {
    const list = [...pending.values()];
    if (platform().storage.persistent === false) {
      say("storage-not-durable", "This app has nowhere to write, so a crash that kills the process cannot be kept for the next launch and will not be reported. Give the process a writable HOME or set BOOSTHIS_STATE_DIR.");
    }
    if (started !== epoch) return;
    await admit(platform().storage.set(STORAGE_KEY, JSON.stringify({ open: list, sealed })));
    memoryOnly = false;
    if (started !== epoch) return;
    await admit(platform().storage.remove(LEGACY_KEY));
  } catch {
    memoryOnly = true;
    writeFailure();
  }
}

async function restore(force = false): Promise<void> {
  if (memoryOnly) return;
  if (restoredOnce && !force) return;
  restoredOnce = true;
  // An answer from an erased lifetime must not refill a replacement lifetime.
  const started = epoch;
  try {
    const raw = await platform().storage.get(STORAGE_KEY) ?? await platform().storage.get(LEGACY_KEY);
    if (started !== epoch) return;
    if (!raw) return;
    const state = JSON.parse(raw);
    const parsed = Array.isArray(state) ? state : state.open;
    if (!Array.isArray(parsed)) return;
    pending.clear();
    sealed = Array.isArray(state.sealed) ? state.sealed : [];
    for (const c of parsed) {
      if (
        c &&
        typeof c.signature === "string" &&
        typeof c.errorName === "string" &&
        typeof c.redactedFrame === "string" &&
        (c.kind === "uncaught" ||
          c.kind === "unhandledRejection" ||
          c.kind === "render") &&
        typeof c.sessionTotal === "number" &&
        typeof c.unsent === "number"
      ) {
        if (pending.has(c.signature)) continue;
        pending.set(c.signature, {
          signature: c.signature,
          errorName: c.errorName,
          kind: c.kind,
          redactedFrame: c.redactedFrame,
          summary: typeof c.summary === "string" ? c.summary : undefined,
          frames: Array.isArray(c.frames) ? (c.frames as CrashFrameData[]) : undefined,
          // The action the previous launch placed this crash in, carried back
          // with it. A restore that dropped these would turn a crash that knew
          // its action into one that never did — and the fatal crash, the one
          // the restore exists for, is exactly the crash worth placing.
          ...(typeof c.traceId === "string" ? { traceId: c.traceId } : {}),
          ...(typeof c.spanId === "string" ? { spanId: c.spanId } : {}),
          sessionTotal: c.sessionTotal,
          unsent: c.unsent,
          lastSeen: typeof c.lastSeen === "number" ? c.lastSeen : Date.now(),
          firstAt: c.firstAt ?? c.lastSeen ?? Date.now(),
          ...(typeof c.routeLabel === "string" ? { routeLabel: c.routeLabel } : { partUnknown: c.partUnknown ?? "part-not-tracked" }),
        });
      }
    }
    evictIfNeeded();
  } catch {
    // Corrupt/absent store — start clean.
  }
}

/* ─── Install / uninstall ────────────────────────────────────────── */

interface ErrorUtilsLike {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (h: (error: unknown, isFatal?: boolean) => void) => void;
}

/**
 * Install the global crash handlers. Called once from `enableTelemetry`.
 * Idempotent: calling again only updates `detailed` and never re-chains the
 * global handler (which would otherwise double-report).
 */
export function installCrashHandlers(opts: { detailed: boolean }): void {
  safeRun("boosthis.crash.install", () => {
    detailedMode = opts.detailed === true;
    if (active) return;
    active = true;
    unsubscribeEntitlement = subscribeEntitlement(() => { if (!isRuntimeInert()) scheduleFlush(); });
    // Origin of the crashFree observation window. Idempotent install won't
    // reset it (early return above), so the window keeps growing across
    // disable()/enable() cycles until forget().
    if (telemetryStartedAt === 0) telemetryStartedAt = Date.now();

    const g = globalThis as unknown as {
      ErrorUtils?: ErrorUtilsLike;
      addEventListener?: (type: string, cb: (e: unknown) => void) => void;
    };

    // Source 1: uncaught JS errors via ErrorUtils — CHAIN the previous handler.
    // We only install our wrapper when we can READ the previous handler
    // (`getGlobalHandler`). If a runtime exposed `setGlobalHandler` WITHOUT a
    // readable getter we could be silently clobbering a host crash handler we
    // can never chain back to — so we skip installation entirely rather than
    // risk swallowing the host's crash flow. On real React Native both are
    // always present, so this loses nothing in practice.
    const eu = g.ErrorUtils;
    if (
      eu &&
      typeof eu.setGlobalHandler === "function" &&
      typeof eu.getGlobalHandler === "function"
    ) {
      prevGlobalHandler = eu.getGlobalHandler() ?? null;
      const previous = prevGlobalHandler;
      eu.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        // Our capture is fully self-wrapped, but guard the boundary anyway so a
        // bug here can NEVER stop the host's own handler from running.
        let called = false;
        const handOff = () => {
          if (called) return;
          called = true;
          try { previous?.(error, isFatal); } catch { /* never throw from our handler */ }
        };
        if (isFatal !== true) { handOff(); return; }
        const timer = setTimeout(handOff, 1500);
        (timer as unknown as { unref?: () => void }).unref?.();
        void capture(error, "uncaught").finally(() => { clearTimeout(timer); handOff(); });
      });
    }

    // Source 2: unhandled promise rejections — ADDITIVE listener only. We never
    // preventDefault, so host/default handling still runs. Skipped on runtimes
    // without addEventListener (we won't clobber RN's own rejection tracker).
    if (typeof g.addEventListener === "function") {
      rejectionListener = (event: unknown) => {
        safeRun("boosthis.crash.rejection", () => {
          const reason =
            event && typeof event === "object" && "reason" in event
              ? (event as { reason: unknown }).reason
              : event;
          capture(reason, "unhandledRejection");
        });
      };
      g.addEventListener("unhandledrejection", rejectionListener);
    }

    // Restore any crashes persisted from a previous (possibly fatal) session
    // and flush them now that a submitter is registered.
    safeAsync("boosthis.crash.restore", async () => {
      await change(() => {});
      await flush();
      retry(true);
    });
  });
}

/**
 * Tear down the handlers and clear all pending crash state, including the
 * persisted store. Called by `telemetry.forget()` so nothing Boosthis-shaped is
 * left on the device. Restores the host's previous global handler.
 */
export async function uninstallCrashHandlers(): Promise<void> {
  epoch += 1;
  activeSubmitter = null;
  flushing = false;
  flushQueued = false;
  restoredOnce = false;
  active = false;
  unsubscribeEntitlement?.();
  unsubscribeEntitlement = undefined;
  detailedMode = false;
  const g = globalThis as unknown as {
    ErrorUtils?: ErrorUtilsLike;
    removeEventListener?: (type: string, cb: (e: unknown) => void) => void;
  };
  safeRun("boosthis.crash.uninstall", () => {
    const eu = g.ErrorUtils;
    if (eu && typeof eu.setGlobalHandler === "function" && prevGlobalHandler) {
      eu.setGlobalHandler(prevGlobalHandler);
    }
    prevGlobalHandler = null;
    if (rejectionListener && typeof g.removeEventListener === "function") {
      g.removeEventListener("unhandledrejection", rejectionListener);
    }
    rejectionListener = null;
  });
  clearTimeout(retryTimer);
  retryTimer = undefined;
  // Drain writes already admitted to platform storage; a queued change from
  // the old lifetime sees the new epoch and never writes.
  await writeTail;
  pending.clear();
  sealed = [];
  crashMoments = [];
  crashTotal = 0;
  telemetryStartedAt = 0;
  try {
    await platform().storage.remove(STORAGE_KEY);
    await platform().storage.remove(LEGACY_KEY);
  } catch {
    // Do not abort telemetry.forget(): its other collectors still need to be
    // stopped. Never include adapter errors, which can contain device data.
    console.warn("[boosthis] Pending crash storage could not be erased. Local crash deletion is not confirmed.");
  }
}

/* ─── Test/debug helpers ─────────────────────────────────────────── */

/** Crashes captured since telemetry started (crashFree axis input). */
export function crashCount(): number {
  return crashMoments.length ? crashMoments.filter(at => at >= Date.now() - 86400000).length : crashTotal;
}

/** Minutes observed since the crash hook was installed (crashFree axis window).
 *  0 before install / after forget. Never throws. */
export function crashWindowMin(): number {
  return windowMinOf(crashWindowMs());
}

/** Milliseconds the crash hook has been installed and watching. 0 before
 *  install / after forget. The ledger banks THIS, not the minutes above: a
 *  four-minute session floored to whole minutes loses a fifth of what it
 *  watched, and banking a floored figure would lose it again every run.
 *  Never throws. */
export function crashWindowMs(): number {
  if (telemetryStartedAt === 0) return 0;
  const ms = Date.now() - telemetryStartedAt;
  return ms > 0 ? Math.min(ms, 86400000) : 0;
}

export const _crashInternals = {
  STORAGE_KEY,
  MAX_CRASHES,
  MAX_BATCH,
  redactError,
  parseStack,
  fileBasename,
  sanitizeErrorName,
  sanitizeSummary,
  bucketCount,
  capture,
  flush,
  buildBatch,
  isActive: () => active,
  isDetailed: () => detailedMode,
  pendingSize: () => pending.size,
  getSealed: () => sealed,
  settled: () => serial,
  getPending: () => [...pending.values()].map((e) => ({ ...e })),
  reset: () => {
    epoch += 1;
    unsubscribeEntitlement?.();
    unsubscribeEntitlement = undefined;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    retryStep = 0;
    sealed = [];
    memoryOnly = false;
    crashMoments = [];
    identity = () => "";
    serial = Promise.resolve();
    writeTail = Promise.resolve();
    said.clear();
    pending.clear();
    active = false;
    detailedMode = false;
    prevGlobalHandler = null;
    rejectionListener = null;
    restoredOnce = false;
    flushing = false;
    flushQueued = false;
    activeSubmitter = null;
    crashTotal = 0;
    telemetryStartedAt = 0;
  },
  setCrashCountForTests: (n: number) => {
    crashTotal = n;
  },
  setTelemetryStartedAtForTests: (t: number) => {
    telemetryStartedAt = t;
  },
  setDetailedForTests: (d: boolean) => {
    detailedMode = d;
  },
  setActiveForTests: (a: boolean) => {
    active = a;
  },
};
