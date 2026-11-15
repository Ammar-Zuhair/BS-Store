// The root Android handler consults the active screen before showing exit UI.
// This keeps OTP's edit-phone action ahead of a parent re-render's listener.
let action: (() => boolean) | null = null;
export function registerScreenBackAction(handler: () => boolean) {
  action = handler;
  return () => { if (action === handler) action = null; };
}
export const handleScreenBack = () => action?.() ?? false;
