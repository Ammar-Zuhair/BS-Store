/*
 * BOOSTHIS-OWNED — DO NOT EDIT.
 * This file is vendored from the Boosthis kit. Editing it makes the kit report
 * a tamper mismatch (run `./boosthis verify .`), which can disable the kit on
 * the next entitlement check-in. To change Boosthis, update it via the hosted
 * Boosthis MCP server instead of editing here.
 */
/* ─── One door for everything this kit sends ───────────────────────────────
 *
 * The React Native runtime runs inside an app on a phone that belongs to a
 * member of the public. When that person's permission is withheld, NOTHING
 * may leave the device — and "nothing" has to mean every sender, including
 * the one somebody adds next year, not the ten that existed when the gate was
 * written.
 *
 * So the gate is a door rather than a rule: every internal upload goes
 * through `_gatedTransmitInternal`, and `__tests__/gatedSend.test.ts` fails the build
 * if any module other than this one imports `_safeTransmitInternal` directly.
 * A new sender therefore cannot bypass the gate by not knowing about it.
 *
 * WHY IT IS NOT INSIDE `transmit.ts`
 * ----------------------------------
 * The same reason as in the browser kit, whose `gatedSend.ts` this mirrors:
 * `transmit.ts` is the shared shape across runtimes — the PII screen, the
 * kill-switch and the inert answer must behave identically in a kit that runs
 * on a customer's own server, where there is no end user's device and nothing
 * to gate. Keeping the gate one layer out keeps that file the same everywhere
 * and keeps the door in exactly one place per kit.
 *
 * THE ONE SEND THAT IS NOT GATED
 * ------------------------------
 * Erasure. A user who has just withdrawn permission needs `/installs/forget`
 * to arrive: refusing to send it would strand their data with us and call it
 * privacy. That call is deliberately not routed through this door.
 *
 * NOT the registration handshake. `client.consent()` and `/installs/consent`
 * are the handshake that registers an install with the Boosthis server; they
 * go through this door like everything else, because registering is the first
 * thing an app whose user said no must not do.
 */

import { maySendToServer } from "./endUserConsent";
import { _safeTransmitInternal, type SafeTransmitOptions } from "./transmit";

/**
 * The statusText a refusal carries.
 *
 * A THIRD answer, distinct from the kill-switch's and the entitlement lock's
 * shared "Boosthis inert", so a caller can tell which of them it is looking
 * at. Exported so tests and callers match on the constant rather than
 * re-typing the string.
 */
export const CONSENT_WITHHELD_STATUS_TEXT = "Boosthis consent withheld";

/**
 * @internal
 *
 * {@link _safeTransmitInternal}, behind the end user's permission.
 *
 * Same parameters, same return. When permission is withheld this makes no
 * request at all and hands back a synthetic 204 stamped
 * `Boosthis consent withheld`, the same shape the inert gate already uses, so
 * no caller can mistake it for a confirmation from the server.
 */
export async function _gatedTransmitInternal(
  endpoint: string,
  payload: unknown,
  opts: SafeTransmitOptions,
  authHeader?: string,
  internalHeaders?: Record<string, string>,
  allowWhenLocked?: boolean,
): Promise<Response> {
  if (!maySendToServer()) {
    return new Response(null, {
      status: 204,
      statusText: CONSENT_WITHHELD_STATUS_TEXT,
    });
  }
  return _safeTransmitInternal(
    endpoint,
    payload,
    opts,
    authHeader,
    internalHeaders,
    allowWhenLocked,
  );
}
