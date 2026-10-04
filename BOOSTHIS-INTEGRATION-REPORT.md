# Boosthis Integration Report

## Result

**Backend integration is deployed and registered with Boosthis.** The active Backend, Customer, Admin, and Courier runtimes are mapped to separate projects through environment configuration. No actual key appears in tracked files.

Each Expo app started with `npx expo start --tunnel` and produced a successful Android Metro bundle. The configured key was present in its corresponding development bundle, as expected for `EXPO_PUBLIC_*`. EAS Production keys were pulled without displaying values and matched their app-local project keys; all three are distinct. No app was opened on a physical device, so mobile telemetry arrival and Dashboard isolation remain unverified.

The Production EAS API URL variable exists in each app, but all three currently use a temporary tunnel domain. It responds to health checks, but `app.config.js` intentionally rejects tunnel URLs for Production builds. A stable HTTPS API domain is required before a Production binary can be built safely.

## Runtime inventory

| Runtime | Framework/version | Boosthis kit |
|---|---|---|
| Backend | ASP.NET Core, .NET 10; SDK 10.0.401 | .NET 1.0.80 |
| Customer | Expo 57.0.26, React Native 0.86.3, React 19.2.3 | RN 1.0.0-alpha.271 |
| Admin | Expo 57.0.26, React Native 0.86.3, React 19.2.3 | RN 1.0.0-alpha.271 |
| Courier | Expo 57.0.26, React Native 0.86.3, React 19.2.3 | RN 1.0.0-alpha.271 |

The scanner also found an unlinked Expo starter under admin-app/bs-store-admin. It has no EAS project configuration; the linked parent admin-app/ is treated as the shipped Admin app. The extra scaffold is recorded for owner review, not instrumented.

## Integration details

- Backend: vendored official .NET kit source under backend/src/BSStore.API/Boosthis/; app.UseBoosthis() runs first after host construction. The key comes from BOOSTHIS_PROJECT_KEY; local server bubble hiding uses BOOSTHIS_NO_BUBBLE=1.
- Customer, Admin, Courier: official RN kit and checklist vendored per app; stable per-install UUID stored in AsyncStorage; telemetry is booted fail-soft and uses expo/fetch.
- Separate fixed label maps are used in each app. No IDs or user-entered data are used as screen names.
- Admin tracks its fixed inventory subtabs (categories, stores, products, deals, service areas) and payment subtabs (bank transfers and driver custody) separately.
- Expo Crypto 57.0.3 was installed in all three projects for Crypto.randomUUID().
- Expo config adds the kit-required Apple privacy manifest reasons C617.1 and 35F9.1 without replacing existing iOS configuration.
- Project keys are environment-only. Expo uses EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY; backend uses BOOSTHIS_PROJECT_KEY. EAS Production holds an independent app-specific variable for each EAS app project. Values are intentionally omitted here.

## Instrumentation options

Enabled: fixed screen/boot measurements, coarse network timing/outcome, image-weight metrics, unhandled-error counts.

Disabled: trace-header propagation, uploaded route/page maps, control census, detailed crash mode, and mobile launcher/bubble. The current RN kit guarantees network timing does not include URL, query, headers, bodies, or HTTP status. No Boosthis failure blocks the app.

The kit's end-user consent default is granted. Review Boosthis's official disclosure (https://www.boosthis.com/docs/what-boosthis-collects) and update the privacy notice through the product owner process before store release; no legal copy was changed.

## Verification

| Check | Result |
|---|---|
| RN archive verification | 141 vendor files verified in each app; integrity OK |
| RN doctor-rn | Exit 0 in all three apps. It emitted static false-positive warnings by scanning internal kit examples for enableTelemetry() without Expo transport; each app's actual host call passes expo/fetch. |
| TypeScript | npx tsc --noEmit --ignoreDeprecations 6.0 passed in all three apps. |
| Existing npm run ts:check | Fails before source checking because TypeScript 6 flags the pre-existing baseUrl option (TS5101). No unrelated tsconfig change was made. |
| Expo Doctor | 21/21 checks passed for Customer, Admin, and Courier. |
| Expo Android export | Blocked by the existing production API URL guard: local configuration resolves to a development tunnel. No URL was substituted or guard bypassed. |
| Backend build and deployment | Release publish passed with zero warnings/errors; service restarted and `/health` returned HTTP 200. |
| Backend Boosthis | A safe health request followed by the loopback-only status check returned “Registered and measuring”. |
| Expo tunnel | Customer, Admin, and Courier each started with `npx expo start --tunnel`; Metro `/status` and Android bundles returned HTTP 200. |
| Development API | The API health endpoint configured in each local `.env` returned HTTP 200. |
| .NET kit checksum | All files in the downloaded archive passed the vendor BOOSTHIS_CHECKSUMS.txt check. |
| EAS key mapping | `eas env:pull --environment production` confirmed each key matches its local app mapping; all three keys are distinct. Values were not printed. |
| EAS Production API | Variable exists and responds HTTP 200, but all three values point to temporary tunnels and are rejected for Production builds by the existing guard. |
| Mobile Dashboard isolation | Pending physical device launches; Metro bundle success alone does not prove telemetry upload or Dashboard isolation. |

The RN kit CLI understands EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY_RN, while the requested app variable is EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY. The app passes the requested variable directly as inviteKey; the official local verifier's key check was run with a temporary process alias and reported kit integrity OK. No alias or key was persisted.

## Changed files

- Backend: src/BSStore.API/Program.cs, src/BSStore.API/Boosthis/*, and .env.example; ignored local backend/.env has the key and bubble setting.
- Each active app: App.tsx, app.config.js, package.json, package-lock.json, new src/monitoring/BoosthisRuntime.tsx, and kit files/config/docs under the app root and lib/.
- Admin nested screens: src/screens/InventoryScreen.tsx and src/screens/PaymentsScreen.tsx add fixed subtab measurements.
- Customer also measures the fixed ProductDetails and OrderDetails labels; Courier adds a PriceChange phase label.
- Root docs: BOOSTHIS-INTEGRATION.md, BOOSTHIS-INTEGRATION-REPORT.md, and BOOSTHIS-PERFORMANCE-BASELINE.md.
- Local .env files are ignored and were not staged. No actual key is in tracked files; eas.json, source constants, and docs contain no key values.

## Manual follow-up before release

1. Replace the temporary tunnel in all three Production `EXPO_PUBLIC_API_URL` values with the stable HTTPS API URL, then validate and build.
2. Launch each app on a test device and confirm its telemetry appears only in the corresponding Boosthis project.
3. Review privacy disclosure with the product owner and collect representative performance samples before publishing a numeric baseline.
4. Decide whether `admin-app/bs-store-admin` is a disposable scaffold or an additional app.

## Official references

- Boosthis install and kit integrity: https://www.boosthis.com/docs/before-you-install
- Boosthis data collection: https://www.boosthis.com/docs/what-boosthis-collects
- Boosthis runtime behavior: https://www.boosthis.com/docs/what-boosthis-adds
- Expo EAS environment variables: https://docs.expo.dev/eas/environment-variables/
