import { Link } from "react-router";
import { useLocale } from "../lib/useLocale";
export default function NotFound() {
  const { text, lang } = useLocale();
  return (
    <section className="not-found container">
      <span>404</span>
      <h1>{text.missingTitle}</h1>
      <p>{text.missingText}</p>
      <Link to={`/${lang}`} className="button primary">
        {text.home}
      </Link>
    </section>
  );
}
