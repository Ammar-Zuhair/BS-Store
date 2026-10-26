# Ammar Profile design system

The user’s brief is the authority for identity, color, Tajawal, bilingual content and both appearances.

UI UX Pro Max was installed with the current `ui-ux-pro-max-cli` using `uipro init --ai codex`. Read `/workspace/.agents/skills/ui-ux-pro-max/SKILL.md` (installed once at the project skill source of truth); queried `developer portfolio editorial --design-system`, then narrowed to `portfolio personal --design-system` after the initial FAQ pattern did not fit. Queried `form validation accessibility --stack react` too. The useful guidance was an asymmetric editorial portfolio, readable hierarchy, visible focus, complete content without animation, restrained scroll reveals and resilient wrapping. Font and aggressive brutalist recommendations were deliberately replaced by the user’s requirements.

Reference: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT). No upstream application code or visual assets were copied; guidance informed original React/CSS. See THIRD_PARTY_NOTICES.md.

- Background / surface / text / muted / primary / on-primary / green / gold / border / control-border / focus / error are semantic CSS variables. Both modes are independently defined in `src/styles.css`.
- Light: #F6F8FB, white, #14283F; blue #245FA4, green #16765F. Gold #926722 is reserved for small accents with readable contrast.
- Dark: #0B1422, #132235, #E7EEF7; blue #8AB8F4, green #73CDB0, gold #D1AD67.
- 8px spacing rhythm with 16/24/32/48/72/112 steps; 1184px maximum reading container; smaller gutters at mobile widths.
- Tajawal local Arabic/Latin 400/500/700 WOFF2, swap, OFL 1.1. No remote font request.
- One SVG icon family (Lucide), clear focus and descriptive accessible control names.
- Monogram is original typography, not a generated portrait. Project covers are explicit typography, not screenshots or invented interfaces.
- Hover feedback 180ms. Scroll entry 360ms, 12px movement, visible content by default. Reduced motion skips animations. No tilt, parallax, auto-rotation or loader.

Technical references verified during implementation: https://vite.dev/guide/static-deploy.html ; https://vite.dev/config/server-options.html#server-allowedhosts ; https://reactrouter.com/start/declarative/installation . The Remote subdomain allowlist uses Vite’s documented leading-dot form, with an optional exact-host override.
