// Covers requests that can outlive their screen (saving, checkout, receipt upload).
let pendingWrites = 0;
let openInteractions = 0;
export function holdUpdates() {
  openInteractions++;
  let released = false;
  return () => { if (!released) { released = true; openInteractions--; } };
}
export function beginWrite() {
  pendingWrites++;
  return () => { pendingWrites--; };
}
export const canApplyUpdate = () => pendingWrites === 0 && openInteractions === 0;
