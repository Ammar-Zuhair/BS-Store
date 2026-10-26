import { ArrowUp } from "lucide-react";
import { useLocale } from "../lib/useLocale";
export default function Footer() {
  const { text } = useLocale();
  return (
    <footer className="site-footer container">
      <div>
        <strong>{text.rights}</strong>
        <p>{text.footer}</p>
      </div>
      <span>© {new Date().getFullYear()}</span>
      <a href="#top" className="back-top">
        {text.backTop}
        <ArrowUp size={17} aria-hidden="true" />
      </a>
    </footer>
  );
}
