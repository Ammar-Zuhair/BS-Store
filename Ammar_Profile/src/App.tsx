import { useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router";
import type { Language } from "./data/profile";
import { LocaleProvider } from "./lib/i18n";
import { useLocale } from "./lib/useLocale";
import { pageMetadata, structuredData } from "./lib/seo";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import ProjectPage from "./pages/ProjectPage";
import NotFound from "./pages/NotFound";
function PageEffects() {
  const location = useLocation();
  const { lang } = useLocale();
  const previous = useRef(location.pathname);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    const metadata = pageMetadata(location.pathname, lang);
    document.title = metadata.title;
    for (const [selector, content] of [
      ['meta[name="description"]', metadata.description],
      ['meta[property="og:title"]', metadata.title],
      ['meta[property="og:description"]', metadata.description],
      ['meta[property="og:locale"]', lang === "ar" ? "ar_YE" : "en_US"],
      ['meta[property="og:type"]', metadata.project ? "article" : "website"],
    ]) {
      document.querySelector(selector)?.setAttribute("content", content);
    }
    const siteUrl = document.querySelector<HTMLMetaElement>(
      'meta[name="site-origin"]',
    )?.content;
    if (siteUrl) {
      document
        .querySelector('link[rel="canonical"]')
        ?.setAttribute("href", siteUrl + location.pathname);
      document
        .querySelector('meta[property="og:url"]')
        ?.setAttribute("content", siteUrl + location.pathname);
      const defaultLink = document.querySelector(
        'link[rel="alternate"][hreflang="x-default"]',
      );
      if (metadata.project) defaultLink?.remove();
      else if (!defaultLink) {
        const link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = "x-default";
        link.href = siteUrl + "/";
        document.head.appendChild(link);
      }
      document
        .querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')
        .forEach((link) => {
          link.href =
            link.hreflang === "x-default"
              ? siteUrl + "/"
              : siteUrl +
                location.pathname.replace(/^\/(ar|en)/, "/" + link.hreflang);
        });
    }
    const schema = document.getElementById("structured-data");
    if (schema)
      schema.textContent = JSON.stringify(
        structuredData(location.pathname, lang, siteUrl),
      );
    if (previous.current !== location.pathname && !location.hash) {
      window.scrollTo(0, 0);
      const heading = document.querySelector<HTMLElement>("main h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
    previous.current = location.pathname;
    if (location.hash) {
      requestAnimationFrame(() => {
        const target = document.getElementById(location.hash.slice(1));
        target?.scrollIntoView({ behavior: "instant" });
        const heading = target?.querySelector<HTMLElement>("h1, h2") || target;
        heading?.setAttribute("tabindex", "-1");
        heading?.focus({ preventScroll: true });
      });
    }
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.animate(
              [
                { opacity: 0.5, transform: "translateY(12px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 360, easing: "ease-out" },
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    document
      .querySelectorAll(".reveal")
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [location.pathname, location.hash, lang]);
  return null;
}
function Layout() {
  const { text } = useLocale();
  return (
    <>
      <a className="skip-link" href="#main-content">
        {text.skip}
      </a>
      <Header />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          {["ar", "en"].map((language) => (
            <Route key={language} path={`/${language}`} element={<Home />} />
          ))}
          {["ar", "en"].map((language) => (
            <Route
              key={language}
              path={`/${language}/projects/:slug`}
              element={<ProjectPage />}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <PageEffects />
    </>
  );
}
export default function App() {
  const { pathname } = useLocation();
  const lang: Language =
    pathname.match(/^\/(ar|en)(?:\/|$)/)?.[1] === "ar" ? "ar" : "en";
  return (
    <LocaleProvider lang={lang}>
      <Layout />
    </LocaleProvider>
  );
}
