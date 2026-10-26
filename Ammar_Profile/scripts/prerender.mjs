import { createServer, loadEnv } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const env = loadEnv("production", process.cwd(), "");
const raw = process.env.SITE_URL || env.SITE_URL || "";
let origin = "";
if (raw) {
  const parsed = new URL(raw);
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error(
      "SITE_URL must be an HTTP(S) origin with no credentials, path, query or fragment.",
    );
  origin = parsed.origin;
}
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
try {
  const { render, pageMetadata, structuredData, projects } =
    await vite.ssrLoadModule("/src/entry-server.tsx");
  const template = await readFile("dist/index.html", "utf8");
  const routes = [
    "/",
    ...["ar", "en"].flatMap((lang) => [
      `/${lang}`,
      ...projects.map((p) => `/${lang}/projects/${p.slug}`),
    ]),
  ];
  for (const path of [...routes, "/404"]) {
    const lang = path.startsWith("/ar") ? "ar" : "en";
    const { title, description, project } = pageMetadata(path, lang);
    const localized = path === "/" ? "/en" : path;
    const links =
      origin && path !== "/404"
        ? `<meta name="site-origin" content="${escape(origin)}"/><link rel="canonical" href="${origin}${path}"/><meta property="og:url" content="${origin}${path}"/>${["ar", "en"].map((l) => `<link rel="alternate" hreflang="${l}" href="${origin}${localized.replace(/^\/(ar|en)/, "/" + l)}"/>`).join("")}${project ? "" : `<link rel="alternate" hreflang="x-default" href="${origin}/"/>`}`
        : "";
    const head = `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"/><meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(description)}"/><meta property="og:type" content="${project ? "article" : "website"}"/><meta property="og:locale" content="${lang === "ar" ? "ar_YE" : "en_US"}"/><meta property="og:site_name" content="Ammar Zuhair Al-Maqtary"/><meta name="twitter:card" content="summary"/>${path === "/404" ? '<meta name="robots" content="noindex"/>' : ""}${links}<script id="structured-data" type="application/ld+json">${JSON.stringify(structuredData(path, lang, origin || undefined)).replace(/</g, "\\u003c")}</script>`;
    const html = template
      .replace(
        '<html lang="en" dir="ltr">',
        `<html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">`,
      )
      .replace("<!--head-->", head)
      .replace('<div id="root">', '<div id="root" data-prerendered="true">')
      .replace("<!--app-->", render(path));
    const out =
      path === "/404"
        ? "dist/404.html"
        : `dist${path === "/" ? "" : path}/index.html`;
    await mkdir(out.slice(0, out.lastIndexOf("/")), { recursive: true });
    await writeFile(out, html);
  }
  await writeFile(
    "dist/robots.txt",
    `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ""}`,
  );
  if (origin)
    await writeFile(
      "dist/sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((path) => `<url><loc>${escape(origin + path)}</loc></url>`).join("")}</urlset>`,
    );
  console.log(
    `Prerendered ${routes.length} public routes + 404. ${origin ? "Canonical, hreflang and sitemap generated." : "SITE_URL absent: no invented canonical domain or sitemap."}`,
  );
} finally {
  await vite.close();
}
