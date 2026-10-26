# Verification report

Tested in this Remote container on 26 October 2026 with Node 22.23.3, Vite 8.3.5, React 19.3.1, React Router 8.5.0 and Chromium through Playwright. Package-lock.json pins exact dependencies. These are local production-preview results, not measurements over an eventual public hosting connection.

## Build and functional checks

- `npm run typecheck`, `npm run lint`, `npm run build`: passed, with no lint warnings.
- Build generates 13 public HTML routes (root, two localized homepages, ten project pages), plus an error page. Project summaries, headings and structured data are present in the HTML, including when JavaScript is disabled.
- 38 Playwright tests cover language preference priority (including English first with Arabic second), explicit paths, storage failure, project/section language switching, saved appearance and system appearance, all five projects, translated contact validation, Unicode mailto encoding, clipboard success/failure, keyboard skip link/disclosure/Escape, and reduced motion.
- Responsive checks: 320, 375, 768, 1024, 1440 CSS pixels × Arabic/English × light/dark, on both the homepage and a project page. No global horizontal overflow was found.
- 200% reflow geometry checked by emulating a 720 CSS-pixel viewport with device scale 2 for a 1440px desktop. This is a controlled geometry simulation, not a claim that every browser’s native zoom UI was manually tested.
- axe-core found no WCAG A/AA violations in automated home and HSA detail-page audits across both languages and both appearances. This complements keyboard/visual checks; it is not a full manual WCAG certification.
- Visual review covered both languages and appearances on 375px mobile and 1440px desktop, plus the project listing, education and contact layouts. Screenshots are local in `.local/screenshots/` and `.local/review/` and are intentionally excluded from source control.
- Public NexusPay and Graduation homepages were inspected through the utility browser. Their approved landing-page captures were converted to responsive WebP and added to their detail pages. No real purchases, trades, wishes or administrative data changes were performed.
- CV download is intentionally absent: no real CV file was supplied. No fake delivery message exists in the contact form; it opens a local email draft and offers copying.

An early test found that clean preview paths served the root fallback HTML rather than their directory index. The preview middleware now serves each prerendered route explicitly; all ten direct project paths were tested without JavaScript.

## Domain configuration

A local-origin build using `SITE_URL=http://127.0.0.1:5173` was used solely to check canonical links, both hreflang alternatives, homepage x-default and the 13 sitemap URLs. It was then replaced with the final domain-free build. The final dist has no invented canonical origin and no sitemap until the real SITE_URL is supplied.

## Lighthouse 13.5.0

| Test | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| English homepage, simulated mobile defaults | 92 | 100 | 100 | 100 | 1.9s | 2.0s | 270ms | 0.003 |
| Arabic homepage, 1440×900 desktop, 1× CPU, 40ms RTT / 10Mbps | 100 | 100 | 100 | 100 | 0.4s | 0.5s | 10ms | 0.004 |

Mobile defaults use Lighthouse’s simulated mobile throttling. Audits ran against the built site on loopback, one at a time. A prior mobile run during other browser work scored 85; the isolated run above scored 92. Scores vary with CPU load and eventual network/hosting conditions. Lighthouse’s additional `agentic-browsing` category scored 50 in both runs; it was not part of the requested four-category target. Raw JSON/HTML reports and the reproducible audit script are retained locally.

## Runtime

Production preview runs as transient systemd unit `ammar-profile-dev-5173.service`, port 5173, bound to `0.0.0.0`. Expected routes: `/ar`, `/en`, `/ar/projects/bs-store`, and their siblings. Service activity, listener, application-specific HTML and logs were checked after startup. Remote hostname allowlisting uses Vite’s documented `.dev.remote-ammar.duckdns.org` suffix, with an exact `PREVIEW_HOST` override available.

The project slug was not supplied in the environment context. No routed URL was guessed from the repository name or machine hostname, and no public-ingress/end-to-end check is claimed. No third-party hosting, domain purchase or GitHub Pages deployment was configured.
