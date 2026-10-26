# Content verification — 26 October 2026

Identity, education, courses, individual/team classification and awards are sourced from the owner’s brief. No CV or personal portrait was found among the provided attachments. The two JPEG attachments were an error screen and an order screen, not a portrait. Other mobile screenshots could expose order/customer data and were deliberately not reused.

Only public-facing descriptions are included. Private clones were reviewed outside the portfolio under the ignored `/workspace/.tools/ammar-profile` path; no private HSA source, repository link or data is included in this portfolio.

| Project | Snapshot | Checked implementation | Boundaries |
|---|---|---|---|
| BS Store | Current `/workspace` tree | Customer cart/order/receipt flows; courier context, purchase and route screens; admin/driver API endpoints; .NET target and Npgsql provider | React Native 0.86.3, Expo 57, TypeScript; .NET 10 / EF Core 10 / PostgreSQL. No purchase executed. Reviewed backend uses phone/password, not verified SMS OTP. Maps open externally; no live in-app tracking claimed. |
| NexusPay | `360037b` | React frontend; Express routes for products, orders, authentication and deposits; PostgreSQL database adapter | Public repository confirmed through GitHub API. Website returned HTTP 200 and browser-inspected. Provider sandbox paths and memory fallbacks exist. No payment, purchase or licensed financial service claimed. |
| GraduateWebsite | `77596ae` | Student directory and wishes pages, DataContext select/insert operations for wishes and memories, Supabase | Public repository confirmed. Live site returned HTTP 200 and browser-inspected. No test wishes or administrative mutations performed. |
| TradeAi | `3fc8b3d` | Expo/TypeScript app, FastAPI router registration, accounts/trades routers, TensorFlow/Keras model loader and MetaTrader adapter | Public repository confirmed. No real trade, broker login, model accuracy or financial returns verified. Team project; individual responsibilities not inferred. |
| HSA | `d7c4f84` | React/Capacitor packages, FastAPI main and waste endpoints, SQLAlchemy session and domain service organization | Public API returned 404 while authorized SSH access worked: treated as private. Read-only review; hardware, trained models and full runtime were not run. Team project; no individual role inferred. |

The HSA university first-place award and Hael Saeed participation certificate remain separate. No certificate artwork, team size, contest name/date, client metrics or English proficiency beyond the provided beginner diploma is invented.

Core techniques follow the owner’s declared experience. TypeScript is tied to code-evidenced projects; Python is contextualized in TradeAi/HSA. Additional owner-supplied techniques are not assigned equal proficiency. All five projects have independent AR/EN detail pages and explicit verification notes.

No final domain, email sending provider, downloadable CV or approved portrait is configured. Those are deliberate integration points, not broken public UI.

Approved public landing-page captures of NexusPay and Graduation were inspected and converted to 640/1280px WebP for their detail pages. They contain no customer/order data. Other covers remain typographic.
