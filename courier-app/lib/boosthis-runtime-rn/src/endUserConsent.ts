/*
 * BOOSTHIS-OWNED — DO NOT EDIT.
 * This file is vendored from the Boosthis kit. Editing it makes the kit report
 * a tamper mismatch (run `./boosthis verify .`), which can disable the kit on
 * the next entitlement check-in. To change Boosthis, update it via the hosted
 * Boosthis MCP server instead of editing here.
 */
/* ─── Boosthis: the switch an end user's consent drives ────────────────────
 *
 * This kit runs inside an app installed on a phone that belongs to a member
 * of the public, not to the developer who shipped the app. Storing
 * information on — or reading it back out of — someone's terminal equipment
 * is regulated in its own right, and the rule is the same shape in the UK
 * (PECR reg. 6) and across the EU (ePrivacy Art. 5(3)): consent is needed
 * unless the storage is strictly necessary for a service THAT person asked
 * for.
 *
 * `docs/decisions/end-user-device-storage-consent.md` holds the item-by-item
 * reading. Its conclusion, which this module implements: nothing this kit
 * stores on an end user's device is strictly necessary for a service the end
 * user requested, so the gate below has no carve-outs — no key keeps being
 * written after the developer switches it off.
 *
 * WHOSE DECISION THIS IS
 * ----------------------
 * The app publisher owns the permission prompt; we own the switch it drives.
 * This module decides nothing about whether a given app needs consent — that
 * is a conclusion about their users and their jurisdiction, and it is not
 * ours to reach. The default is `granted`, an unchanged install behaves
 * exactly as it did, and the install guide says so plainly next to the recipe.
 *
 * NOT TO BE CONFUSED WITH `client.consent()`
 * ------------------------------------------
 * The kit's `consent()` method and the `/installs/consent` endpoint are the
 * handshake that REGISTERS this install with the Boosthis server. They have
 * nothing to do with the end user's permission. Customer-facing text calls
 * that handshake "registration" for exactly this reason; the code keeps the
 * old name because renaming a live wire path to fix a wording problem would
 * break every install in the field.
 *
 * A LEAF, ON PURPOSE
 * ------------------
 * This module imports `perfPlatform.ts` and nothing else. Everything that has
 * to REACT to a change — stopping timers, erasing in-memory state, asking the
 * server to delete an install — subscribes through `_onEndUserConsentChange()`
 * instead of being imported from here. A module that both drives the gate and
 * is imported by the gate is a cycle, and the cycle guard would (rightly)
 * fail it.
 *
 * WHY THE SWITCH IS SYNCHRONOUS AND THE ERASE IS NOT
 * --------------------------------------------------
 * A permission callback is not a place to await anything, so
 * `setEndUserConsent()` returns immediately: the gate is shut before it
 * returns, which is the part that must not race. The sweep of what was
 * already on the device is asynchronous because this platform's store is,
 * and it is started here rather than awaited. A caller that needs to know it
 * finished can await `clearDeviceStorage()` itself.
 */

import {
  clearDeviceStorage,
  setDevicePersistenceAllowed,
} from "./perfPlatform";

/**
 * The three states, and there are exactly three.
 *
 * Two would not do it. "On" and "off" cannot express the publisher who knows
 * they will never obtain consent and still wants to see how their app
 * performs — they need measurement without storage, which is neither of the
 * other two answers.
 */
export const END_USER_CONSENT_STATES = [
  /** Permission held. Device storage allowed; the kit behaves as it always
   *  has. The default. */
  "granted",
  /** No permission. Nothing is stored on the device and nothing is sent. */
  "withheld",
  /** Measure, but store nothing durable. Uploads continue; every reading that
   *  needs state across a launch is ABSENT rather than estimated. */
  "memory-only",
] as const;

export type EndUserConsent = (typeof END_USER_CONSENT_STATES)[number];

/** What an install that says nothing runs as. See the decision record for why
 *  this is `granted` and not `withheld`. */
export const DEFAULT_END_USER_CONSENT: EndUserConsent = "granted";

/** What a listener is told. `previous` matters: leaving `granted` is the
 *  transition that erases, and a listener that only sees the new state cannot
 *  tell an erase-and-stop from a start-up in the same state. */
export interface EndUserConsentChange {
  state: EndUserConsent;
  previous: EndUserConsent;
  /** True when this change left `granted`, i.e. the device is being cleared. */
  erased: boolean;
}

type ConsentListener = (change: EndUserConsentChange) => void;

let state: EndUserConsent = DEFAULT_END_USER_CONSENT;
const listeners = new Set<ConsentListener>();

/** The device sweep the most recent withdrawal started, or a settled promise
 *  when none has run. Never rejects. */
let deviceSweep: Promise<unknown> = Promise.resolve();

/**
 * @internal The sweep of the device, for a listener that must not put
 * anything back until it has finished. Not re-exported from `index.ts`: an
 * app that wants to know the device is clear awaits `clearDeviceStorage()`.
 */
export function _deviceSweepSettled(): Promise<unknown> {
  return deviceSweep;
}

/** Is this one of the three words? A value outside the set is REFUSED, never
 *  coerced to the nearest one — guessing at "off" or "no" would make the kit's
 *  behaviour depend on a developer's spelling. */
export function isEndUserConsentState(v: unknown): v is EndUserConsent {
  return (
    typeof v === "string" &&
    (END_USER_CONSENT_STATES as readonly string[]).includes(v)
  );
}

/** The state now. */
export function getEndUserConsent(): EndUserConsent {
  return state;
}

/** May anything be written to the end user's device? */
export function mayStoreOnDevice(): boolean {
  return state === "granted";
}

/** May anything leave this device? False only in `withheld` — `memory-only`
 *  is about the device, not the network. Erasure is the one exception: it
 *  goes out through a path this does not gate, because a user who has just
 *  withdrawn permission needs the delete request to reach us, and refusing to
 *  send it would trap their data here. */
export function maySendToServer(): boolean {
  return state !== "withheld";
}

/**
 * Apply a state.
 *
 * Synchronous and never throws — a permission callback is not a place to
 * handle an exception. Any move OUT of `granted` clears the device: switching
 * off is not "stop writing", and a publisher whose user just withdrew
 * permission needs what was already stored to be gone. The gate shuts before
 * this returns; the sweep runs after it (see the note at the top).
 *
 * Returns the state now in force, which is the previous one when the value
 * was not one of the three words.
 */
export function setEndUserConsent(next: unknown): EndUserConsent {
  if (!isEndUserConsentState(next)) return state;
  const previous = state;
  if (next === previous) return state;
  state = next;

  // Close (or open) the durable half FIRST, so nothing can land on the device
  // between here and the sweep below.
  try {
    setDevicePersistenceAllowed(next === "granted");
  } catch {
    /* a switch must never throw */
  }

  const erased = previous === "granted";
  if (erased) {
    try {
      // KEPT, not merely started. The sweep is the device half of the
      // erasure, and a grant that follows a withdrawal has to wait for it:
      // a resume that overlaps an unfinished sweep re-registers, writes a
      // fresh credential, and hands it to a sweep still deleting by prefix.
      // The switch itself still returns immediately — a banner callback
      // waits for nothing — and only a listener that asks gets the promise.
      deviceSweep = clearDeviceStorage().catch(() => 0);
    } catch {
      /* best-effort: the gate is shut either way */
    }
  }

  const change: EndUserConsentChange = { state: next, previous, erased };
  for (const fn of Array.from(listeners)) {
    try {
      fn(change);
    } catch {
      // One listener's failure must not stop the others, and must not turn a
      // consent change into an app crash.
    }
  }
  return state;
}

/**
 * @internal Subscribe to changes. Returns an unsubscribe function.
 *
 * Not re-exported from `index.ts`: this is how the runtime's own modules
 * react, not a developer-facing hook. An app that wants to know what state
 * the kit is in calls `getEndUserConsent()`.
 */
export function _onEndUserConsentChange(fn: ConsentListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * What a start call asks for, or `null` when it asks for nothing.
 *
 * `null` is not the same as `granted`, and the difference is the whole point.
 * Setting the state and then starting the kit is a natural order for an app
 * whose permission prompt has already been answered:
 *
 *     setEndUserConsent(prompt.answered ? "granted" : "withheld");
 *     enableTelemetry({ installId, inviteKey });
 *
 * If a start call that named nothing returned `granted`, that second line
 * would silently overrule the first. So a call that says nothing leaves the
 * state alone, whatever it is.
 *
 * There is no `respectDoNotTrack` here and there will not be an invented
 * equivalent: no mobile platform publishes a device-storage permission signal
 * to read. App Tracking Transparency governs the advertising identifier,
 * which this kit never touches, and reading an ATT answer as a storage
 * permission would be us inventing a meaning the platform does not give it.
 */
export function resolveStartConsent(opts?: {
  endUserConsent?: unknown;
}): EndUserConsent | null {
  return isEndUserConsentState(opts?.endUserConsent)
    ? opts.endUserConsent
    : null;
}

/** Test-only: back to the shipped default, with no listeners attached. */
export function _resetEndUserConsentForTests(): void {
  state = DEFAULT_END_USER_CONSENT;
  listeners.clear();
  deviceSweep = Promise.resolve();
  try {
    setDevicePersistenceAllowed(true);
  } catch {
    /* ignore */
  }
}
