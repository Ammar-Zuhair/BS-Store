import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { projects } from "./src/data/projects.ts";
import { readFile } from "node:fs/promises";
const publicRoutes = new Set([
  "/",
  ...["ar", "en"].flatMap((lang) => [
    `/${lang}`,
    ...projects.map((p) => `/${lang}/projects/${p.slug}`),
  ]),
]);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const previewHost = process.env.PREVIEW_HOST || env.PREVIEW_HOST;
  return {
    plugins: [
      react(),
      {
        name: "prerendered-clean-urls",
        configurePreviewServer(server) {
          server.middlewares.use((req, res, next) => {
            const [pathname, query] = (req.url || "/").split("?");
            const clean = pathname.replace(/\/$/, "") || "/";
            if (clean !== "/" && publicRoutes.has(clean)) {
              req.url = `${clean}/index.html${query ? "?" + query : ""}`;
            } else if (
              !publicRoutes.has(clean) &&
              !pathname.split("/").pop()?.includes(".")
            ) {
              void readFile("dist/404.html")
                .then((html) => {
                  res.statusCode = 404;
                  res.setHeader("Content-Type", "text/html; charset=utf-8");
                  res.end(html);
                })
                .catch(next);
              return;
            }
            next();
          });
        },
      },
    ],
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      allowedHosts: previewHost
        ? [previewHost]
        : [".dev.remote-ammar.duckdns.org"],
    },
    preview: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      allowedHosts: previewHost
        ? [previewHost]
        : [".dev.remote-ammar.duckdns.org"],
    },
    build: { target: "es2022" },
  };
});
