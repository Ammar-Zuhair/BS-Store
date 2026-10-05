# Boosthis Integration

## Status

Boosthis is wired into the active ASP.NET Core backend and the three active Expo applications. Runtime kits were obtained from the official Boosthis setup flow, integrity-checked, and integrated without adding any project key to tracked source or configuration files.

The Backend was published and restarted after additive database migrations. A safe health request returned HTTP 200, and the loopback status page confirmed “Registered and measuring” in the Backend Boosthis project. Each app also built its Android development bundle through `npx expo start --tunnel`; a physical device session is still needed to verify mobile uploads and project isolation.

## Discovered environments

| Active environment | Runtime | Project key variable | Local environment file |
|---|---|---|---|
| Backend | ASP.NET Core, .NET 10 | BOOSTHIS_PROJECT_KEY | backend/.env |
| Customer App | Expo SDK 57, React Native 0.86 | EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY | customer-app/.env |
| Admin App | Expo SDK 57, React Native 0.86 | EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY | admin-app/.env |
| Courier App | Expo SDK 57, React Native 0.86 | EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY | courier-app/.env |

The project-wide Boosthis scanner also found admin-app/bs-store-admin, an unlinked Expo starter scaffold with no EAS project configuration. The active Admin app is the parent admin-app project, which is linked to EAS and contains the current admin workflows. The scaffold was not instrumented; if it is intended to become a separately shipped app, it needs an owner decision and its own project mapping first.

## Kit versions and source

- React Native / Expo kit: 1.0.0-alpha.271.
- Boosthis checklist dependency: 0.1.0.
- .NET kit: 1.0.80.
- .NET SDK used for validation: 10.0.401.
- Expo Crypto: 57.0.3, installed through expo install for stable per-install UUIDs.

The Boosthis RN archive was verified using its bundled verifier: 141 files passed for each app. The .NET archive was checked using the kit's BOOSTHIS_CHECKSUMS.txt; all checksums passed. The .NET kit files were copied byte-for-byte under backend/src/BSStore.API/Boosthis/.

## Environment and project separation

The local .env files hold their own project's value and are excluded from Git. Each .env.example contains only variable names and blank values. Backend reads BOOSTHIS_PROJECT_KEY from its existing environment-file setup; the service's environment file is backend/.env.

Each EAS app project has its own Production environment variable named EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY. Customer, Admin, and Courier each use the matching EAS project and matching key; no project shares another app's key. EXPO_PUBLIC_ values are embedded in client builds and are not treated as secrets inside an APK/AAB. EAS Production profiles select the production environment; Preview uses a separate environment and receives no Boosthis key unless one is configured there explicitly.

Expo code passes the canonical project variable directly to enableTelemetry({ inviteKey }). The current RN kit's command-line verifier only resolves EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY_RN, so a bare verifier run reports that it cannot see the canonical variable even though the app passes it directly. For integrity verification, the kit verifier was run with a temporary process-only alias sourced from that app's own local environment file; no value was written into boosthis.config.json or printed.

Production EAS configuration was checked with `eas env:pull` without printing or retaining values. Each app's project key matches its local `.env` mapping, and all three are distinct. The Production `EXPO_PUBLIC_API_URL` variable is present for all three apps but currently points to a temporary tunnel domain. Those health checks return HTTP 200, while the app configuration correctly refuses tunnel URLs for Production builds. A stable HTTPS API URL is needed before those builds can succeed.

## Backend integration

- Added the official .NET kit's Boosthis/ source files under the API project.
- Added app.UseBoosthis() immediately after builder.Build(), before the existing ASP.NET middleware.
- BOOSTHIS_PROJECT_KEY is read from the process environment; there is no key in Program.cs, appsettings*.json, or source.
- BOOSTHIS_NO_BUBBLE=1 is present in the ignored local backend environment and blank-key .env.example. The API is JSON-only and has no user-facing bubble.
- The middleware is fail-safe per the kit documentation. It measures requests using route templates and does not need request/response bodies, authorization headers, query strings, phone numbers, or customer data.

The API was restarted and checked through a safe read-only health endpoint. Its loopback-only Boosthis status page reports registered and measuring. This produces one initial Backend measurement, which is not enough for a meaningful performance baseline.

## Mobile integration

Each app has the official lib/boosthis-runtime-rn and lib/boosthis-checklist packages, official setup files, manifest, and helper. The root instrumentation component:

- starts telemetry asynchronously and never blocks or crashes the app if storage or Boosthis is unavailable;
- persists a random UUIDv4 install ID in AsyncStorage, separately per app;
- uses Expo SDK's expo/fetch transport;
- records static screen labels, boot phases, input responsiveness, coarse request duration/outcome, image layout weight, and unhandled-error counts;
- disables trace propagation, route-list upload, control census, page maps, and detailed crash data;
- does not mount BoosthisLauncher. The RN kit also limits the bubble to development builds; production users see no bubble.

Instrumented fixed labels:

- Customer: Home, Categories, Stores, StoreDetails, ProductDetails, Cart, Checkout, Orders, OrderDetails, Profile, Authentication.
- Admin: Dashboard, Orders, Payments, BankTransfers, DriverCustody, Inventory, Categories, Stores, Products, Deals, ServiceAreas, ProductEditor, Financials, PriceChanges, SystemManagement, Notifications, Authentication.
- Courier: DriverHome, Delivery, Purchase, Earnings, Authentication. The courier app has no separate price-change screen; price updates remain an admin action.

Labels do not contain customer, order, product, store, driver IDs, phone numbers, addresses, or search text. The current Customer app has no distinct Notifications screen; notifications open an existing fixed route.

All three dynamic Expo configs now include the Apple required-reason privacy-manifest entries specified by the Boosthis RN kit: file timestamp (C617.1) and system boot time (35F9.1).

## Telemetry and privacy choices

- autoWrapNetwork: true: the current kit reports only duration and a coarse outcome; it does not read or send URL, host, path, headers, body, or status code.
- trackUnhandledErrors: true: counts only; no error message or stack is enabled by this option.
- trackImageWeight: true: geometry/weight measurement only, not image URLs or image content.
- traceScreens: false; no trace headers are propagated to any host.
- sendPageMap: false; route-list and control-census collectors are disabled.
- crashDetails: false; Detailed Crash Mode remains off.
- End-user telemetry consent uses the kit's documented default (granted); review the official disclosure and update the product privacy notice through the normal owner/legal process before store release. No legal text was changed here.

See Boosthis setup guidance (https://www.boosthis.com/docs/before-you-install), data disclosure (https://www.boosthis.com/docs/what-boosthis-collects), and runtime behavior (https://www.boosthis.com/docs/what-boosthis-adds). See Expo's EAS environment-variable guide (https://docs.expo.dev/eas/environment-variables/) for managing build values.

## Bubble and disable controls

- Backend: BOOSTHIS_NO_BUBBLE=1 hides the optional server bubble without disabling monitoring.
- Mobile: the app does not mount the optional launcher; the kit's release build does not show its development bubble.
- BOOSTHIS_DISABLED=1 disables monitoring entirely and is not set.

## Key rotation

Rotate a project key in Boosthis Dashboard, replace only that runtime's local/EAS environment value, and rebuild/update that app. Never place the value in source, app config, boosthis.config.json, documentation, a command argument, or a log. Mobile project keys are intentionally public-capability keys once embedded in the build.

## Scanner and kit retrieval

The official scanner command is appropriate for repository discovery when the placeholder is replaced by a real project key. The scanner inspects manifests and nested folders, not source code. It found the four active environments listed above plus the unlinked Admin scaffold. The official RN kit archive was retrievable and passed its verifier. The .NET archive passed the vendor checksum list. The Courier key was rejected by the RN archive endpoint; the same unmodified RN kit archive was retrieved with the Backend key for transport only. That Backend key is not configured in any mobile project.

## Remaining verification

1. Run each app on a test device/build, visit its instrumented routes, and confirm telemetry reaches only its corresponding Boosthis project.
2. Collect representative sessions before writing a meaningful performance baseline.
3. Configure the stable HTTPS production API URL in all three Production EAS environments; keep the guard that rejects temporary tunnels.
4. Decide whether the nested admin-app/bs-store-admin scaffold is to be removed, retained as a template, or separately shipped.
