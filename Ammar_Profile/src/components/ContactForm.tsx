import { useRef, useState, type FormEvent } from "react";
import { Copy, Mail } from "lucide-react";
import { useLocale } from "../lib/useLocale";
import {
  prepareContact,
  validateContact,
  type ContactFields,
  type FieldErrors,
} from "../lib/contact";
export default function ContactForm() {
  const { text } = useLocale();
  const [fields, setFields] = useState<ContactFields>({
    name: "",
    email: "",
    kind: "",
    message: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<
    "idle" | "opened" | "copied" | "copy-error"
  >("idle");
  const [prepared, setPrepared] = useState("");
  const summary = useRef<HTMLDivElement>(null);
  function update(key: keyof ContactFields, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setStatus("idle");
    setPrepared("");
  }
  function prepare() {
    const issues = validateContact(fields, text);
    setErrors(issues);
    if (Object.keys(issues).length) {
      requestAnimationFrame(() => summary.current?.focus());
      return null;
    }
    const message = prepareContact(fields, text);
    setPrepared(`${message.subject}\n\n${message.body}`);
    return message;
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = prepare();
    if (!message) return;
    setStatus("opened");
    // This only requests the local email client; it does not send a message.
    window.location.href = message.mailto;
  }
  async function copy() {
    const message = prepare();
    if (!message) return;
    try {
      await navigator.clipboard.writeText(
        `${message.subject}\n\n${message.body}`,
      );
      setStatus("copied");
    } catch {
      setStatus("copy-error");
    }
  }
  const errorKeys = (Object.keys(errors) as (keyof ContactFields)[]).filter(
    (key) => errors[key],
  );
  const names = {
    name: text.nameLabel,
    email: text.emailField,
    kind: text.kindLabel,
    message: text.messageLabel,
  };
  const fieldA11y = (key: keyof ContactFields) => ({
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });
  return (
    <form className="contact-form" noValidate onSubmit={submit}>
      <p className="form-intro">{text.required}</p>
      {errorKeys.length > 0 && (
        <div ref={summary} tabIndex={-1} className="error-summary" role="alert">
          <strong>{text.errorTitle}</strong>
          <ul>
            {errorKeys.map((key) => (
              <li key={key}>
                <a
                  href={`#${key}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(key)?.focus();
                  }}
                >
                  {names[key]}: {errors[key]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="form-row">
        <div className="field">
          <label htmlFor="name">{text.nameLabel}</label>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            maxLength={120}
            placeholder={text.namePlaceholder}
            value={fields.name}
            onChange={(e) => update("name", e.target.value)}
            {...fieldA11y("name")}
          />
          {errors.name && (
            <span id="name-error" className="field-error">
              {errors.name}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="email">{text.emailField}</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            maxLength={254}
            placeholder={text.emailPlaceholder}
            value={fields.email}
            onChange={(e) => update("email", e.target.value)}
            {...fieldA11y("email")}
          />
          {errors.email && (
            <span id="email-error" className="field-error">
              {errors.email}
            </span>
          )}
        </div>
      </div>
      <div className="field">
        <label htmlFor="kind">{text.kindLabel}</label>
        <select
          id="kind"
          name="kind"
          required
          value={fields.kind}
          onChange={(e) => update("kind", e.target.value)}
          {...fieldA11y("kind")}
        >
          <option value="">{text.kindPlaceholder}</option>
          {Object.entries(text.kinds).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
        {errors.kind && (
          <span id="kind-error" className="field-error">
            {errors.kind}
          </span>
        )}
      </div>
      <div className="field">
        <label htmlFor="message">{text.messageLabel}</label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={5000}
          placeholder={text.messagePlaceholder}
          value={fields.message}
          onChange={(e) => update("message", e.target.value)}
          {...fieldA11y("message")}
        />
        {errors.message && (
          <span id="message-error" className="field-error">
            {errors.message}
          </span>
        )}
      </div>
      <p className="form-help">{text.mailHelp}</p>
      <div className="form-buttons">
        <button type="submit" className="button primary">
          <Mail size={18} aria-hidden="true" />
          {text.mailButton}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => void copy()}
        >
          <Copy size={17} aria-hidden="true" />
          {text.copy}
        </button>
      </div>
      <div className="form-status" role="status" aria-live="polite">
        {status === "opened"
          ? text.mailOpened
          : status === "copied"
            ? text.copied
            : status === "copy-error"
              ? text.copyError
              : ""}
      </div>
      {prepared && (
        <div className="field prepared-message">
          <label htmlFor="prepared-message">{text.prepared}</label>
          <textarea id="prepared-message" rows={7} readOnly value={prepared} />
        </div>
      )}
    </form>
  );
}
