/*
 * BOOSTHIS-OWNED — DO NOT EDIT.
 * This file is vendored from the Boosthis kit. Editing it makes the kit report
 * a tamper mismatch (run `./boosthis verify .`), which can disable the kit on
 * the next entitlement check-in. To change Boosthis, update it via the hosted
 * Boosthis MCP server instead of editing here.
 */
import { isBoosthisDisabled } from "./runtimeFlags";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

type BubbleGlobals = {
  BOOSTHIS_BUBBLE?: string | boolean;
  BOOSTHIS_NO_BUBBLE?: string | boolean;
  BOOSTHIS_FORCE_BUBBLE?: string | boolean;
};

function parseDirective(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

/** Read an env/global value without assuming `process` exists on the device. */
function readRaw(name: keyof BubbleGlobals): unknown {
  try {
    if (typeof process !== "undefined" && process.env) {
      const value = process.env[name];
      if (typeof value === "string" && value.length > 0) return value;
    }
    return (globalThis as unknown as BubbleGlobals)[name];
  } catch {
    return undefined;
  }
}

/**
 * Is this a development build? The bubble is for the app's owner, who runs
 * development builds; a release build (the one the app's own users install)
 * never draws it, whatever is set (owner decision, 4 Oct 2026).
 *
 * Either reading is enough: the bare `__DEV__` Metro (or a bundler's define)
 * writes into the code, or the global of the same name Metro's prelude
 * declares. A flag that is missing or unreadable is NOT a development build,
 * so the failure is a hidden bubble, never one on a customer's phone.
 */
export function isDevelopmentBuild(): boolean {
  try {
    if (typeof __DEV__ !== "undefined" && __DEV__ === true) return true;
  } catch {
    // Fall through to the global.
  }
  try {
    return (globalThis as { __DEV__?: unknown }).__DEV__ === true;
  } catch {
    return false;
  }
}

/** Resolve launcher visibility. Precedence is kill switch, release build,
 * directive, legacy aliases, code option, then the visible default. */
export function resolveBubbleVisibility(option?: boolean): boolean {
  try {
    if (isBoosthisDisabled()) return false;
  } catch {
    // The kill switch is an entitlement stop. A failed read must never defeat
    // it, so this one signal alone fails closed.
    return false;
  }

  // A release build never draws the bubble; no setting below can force it.
  if (!isDevelopmentBuild()) return false;

  try {
    const directive = parseDirective(readRaw("BOOSTHIS_BUBBLE"));
    if (directive !== undefined) return directive;

    // Backward compatibility: the old opt-out and force-on controls remain
    // supported, but the documented BOOSTHIS_BUBBLE directive outranks them.
    if (parseDirective(readRaw("BOOSTHIS_NO_BUBBLE")) === true) return false;
    if (parseDirective(readRaw("BOOSTHIS_FORCE_BUBBLE")) === true) return true;

    if (option !== undefined) return option;
    return true;
  } catch {
    // Bubble controls are presentation preferences, not entitlement stops.
    // A malformed/throwing host global must not silently hide a valid install.
    return true;
  }
}