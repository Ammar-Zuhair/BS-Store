import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const lang = process.argv[2] || "en";
const desktop = process.argv[3] === "desktop";
const chrome = await launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const result = await lighthouse(`http://127.0.0.1:5173/${lang}`, {
    port: chrome.port,
    output: ["json", "html"],
    logLevel: "error",
    ...(desktop
      ? {
          formFactor: "desktop",
          screenEmulation: {
            mobile: false,
            width: 1440,
            height: 900,
            deviceScaleFactor: 1,
            disabled: false,
          },
          throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1,
            requestLatencyMs: 0,
            downloadThroughputKbps: 0,
            uploadThroughputKbps: 0,
          },
        }
      : {}),
  });
  await mkdir(".local", { recursive: true });
  const name = `.local/lighthouse-${lang}-${desktop ? "desktop" : "mobile"}`;
  await writeFile(`${name}.json`, result.report[0]);
  await writeFile(`${name}.html`, result.report[1]);
  console.log(
    JSON.stringify(
      {
        url: result.lhr.finalDisplayedUrl,
        mode: desktop ? "desktop" : "mobile",
        version: result.lhr.lighthouseVersion,
        categories: Object.fromEntries(
          Object.entries(result.lhr.categories).map(([k, v]) => [
            k,
            Math.round(v.score * 100),
          ]),
        ),
        metrics: Object.fromEntries(
          [
            "first-contentful-paint",
            "largest-contentful-paint",
            "total-blocking-time",
            "cumulative-layout-shift",
          ].map((key) => [key, result.lhr.audits[key].displayValue]),
        ),
      },
      null,
      2,
    ),
  );
} finally {
  await chrome.kill();
}
