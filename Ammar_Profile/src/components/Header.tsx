import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useLocale } from "../lib/useLocale";
import { profile } from "../data/profile";
import { storePreference } from "../lib/preferences";
import { DirectionArrow } from "./Icons";
export default function Header() {
  const { text, lang } = useLocale();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const other = lang === "ar" ? "en" : "ar";
  const equivalent = `${location.pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${other}`)}${location.search}${location.hash}`;
  const items = [
    ["work", text.work],
    ["services", text.services],
    ["about", text.about],
    ["journey", text.journey],
  ];
  useEffect(() => {
    if (!open) return;
    const query = matchMedia("(max-width: 760px)");
    const closeOnWide = () => {
      if (!query.matches) setOpen(false);
    };
    query.addEventListener("change", closeOnWide);
    navRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      query.removeEventListener("change", closeOnWide);
    };
  }, [open]);
  function toggleTheme() {
    const value =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = value;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", value === "dark" ? "#0B1422" : "#F6F8FB");
    storePreference("ammar-theme", value);
  }
  return (
    <header className="site-header" id="top">
      <div className="header-inner container">
        <Link
          className="brand"
          to={`/${lang}`}
          aria-label={profile.name[lang]}
          onClick={() => setOpen(false)}
        >
          <span className="brand-mark" aria-hidden="true">
            a<span>.</span>
          </span>
          <span className="brand-text">
            {lang === "ar" ? "عمار المقطري" : "Ammar Al-Maqtary"}
            <small>WEB & MOBILE DEVELOPER</small>
          </span>
        </Link>
        <nav
          ref={navRef}
          id="main-navigation"
          className={`main-nav ${open ? "is-open" : ""}`}
          aria-label={text.navigation}
        >
          {items.map(([id, title]) => (
            <Link key={id} to={`/${lang}#${id}`} onClick={() => setOpen(false)}>
              {title}
            </Link>
          ))}
          <Link
            className="mobile-contact"
            to={`/${lang}#contact`}
            onClick={() => setOpen(false)}
          >
            {text.contact}
          </Link>
        </nav>
        <div className="header-actions">
          <Link
            to={equivalent.startsWith(`/${other}`) ? equivalent : `/${other}`}
            className="language-switch"
            lang={other}
            onClick={() => {
              storePreference("ammar-language", other);
              setOpen(false);
            }}
            aria-label={text.languageLabel}
          >
            {text.language}
          </Link>
          <button
            className="icon-button theme-button"
            onClick={toggleTheme}
            aria-label={text.theme}
          >
            <Sun className="sun-icon" size={19} aria-hidden="true" />
            <Moon className="moon-icon" size={19} aria-hidden="true" />
          </button>
          <Link className="header-contact" to={`/${lang}#contact`}>
            {text.getInTouch}
            <DirectionArrow />
          </Link>
          <button
            className="icon-button menu-toggle"
            ref={toggleRef}
            aria-label={open ? text.closeMenu : text.menu}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <X size={23} aria-hidden="true" />
            ) : (
              <Menu size={23} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
