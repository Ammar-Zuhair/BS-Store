import { profile } from "../data/profile";
import type { Dictionary } from "../data/ui";
export type ContactFields = {
  name: string;
  email: string;
  kind: string;
  message: string;
};
export type FieldErrors = Partial<Record<keyof ContactFields, string>>;
export function validateContact(
  fields: ContactFields,
  text: Dictionary,
): FieldErrors {
  const errors: FieldErrors = {};
  if (fields.name.trim().length < 2) errors.name = text.errors.name;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
    errors.email = text.errors.email;
  if (!Object.hasOwn(text.kinds, fields.kind)) errors.kind = text.errors.kind;
  if (fields.message.trim().length < 10) errors.message = text.errors.message;
  return errors;
}
export function prepareContact(fields: ContactFields, text: Dictionary) {
  const kind =
    text.kinds[fields.kind as keyof typeof text.kinds] || text.kinds.other;
  const subject = `${kind} — ${fields.name.trim().replace(/[\r\n]/g, " ")}`;
  const body = `${text.nameLabel}: ${fields.name.trim()}\n${text.emailField}: ${fields.email.trim()}\n${text.kindLabel}: ${kind}\n\n${fields.message.trim()}`;
  return {
    body,
    subject,
    mailto: `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
// Integration seam: a future server provider can implement this interface.
// Never put a provider secret in browser code or a VITE_* variable.
export interface ContactTransport {
  send(fields: ContactFields): Promise<{ delivered: boolean }>;
}
