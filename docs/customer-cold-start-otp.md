# Customer cold-start updates, OTP input and static startup logo

Implemented 2026-11-16 for the customer application only.

## Behavior

- OTA updates download silently. There is no programmatic reload, process exit, background reload or resume reload. Expo's existing native update loader applies the cached update on the next cold start after the user fully closes and opens the app. Switching apps, locking the phone and returning keep the current session and running bundle.
- The existing production channel, Expo project and runtime 1.0.2 stay unchanged. No native dependencies or build changes are required.
- The supplied startup videos, poster images, native/web video players, media lookup and HTML playback helper are removed from the current source. Startup shows the existing app logo on the active theme's background while version, maintenance, fonts, theme and session readiness resolve. It proceeds as soon as those checks finish; there is no video delay, spinner, progress text or skip button. Required native updates and maintenance remain enforced; the existing five-second API timeout still permits offline startup.
- OTP login and signup share six separate boxes with first-box focus, automatic advance, backspace navigation, paste/autofill, Arabic/Persian digit normalization and automatic verification after six digits. Inputs lock during verification; an in-flight guard prevents duplicate automatic/manual requests.
- Invalid/expired client errors show the server message, red borders and a short 300ms shake. Network/server failures show an error without falsely marking the code incorrect. Editing clears the error state. Reduced-motion settings disable the shake and success spring.
- A green check and success acknowledgement appear only after backend verification and existing session persistence succeed. The acknowledgement runs for 750ms before the existing provider chooses home for existing users or required profile completion for new users. Presentation failures cannot discard the verified session. OTP values are never persisted.

## Files

- `customer-app/src/system/SilentUpdates.tsx`: download-only updater; removed foreground/background application policy.
- `customer-app/src/system/SystemGate.tsx`: static readiness gate.
- `customer-app/src/startup/StartupLogo.tsx`: themed static logo.
- `customer-app/src/components/OtpCodeInput.tsx`: six-box entry, focus, normalization, feedback and accessibility.
- `customer-app/src/screens/AuthScreen.tsx`: automatic verification, success acknowledgement and reset on resend.
- `customer-app/src/context/AppContext.tsx`: optional presentation callback between verified session persistence and navigation.
- `customer-app/tests/{otp-auth,startup,search-and-updates,order-hours-and-navigation}.cjs`: updated behavioral coverage.
- Removed `src/system/silentUpdatePolicy.ts`, previous `src/startup/{StartupIntro,IntroPlayer,IntroPlayer.web,media,videoHtml}` and `assets/intro/{dark.mp4,light.mp4,dark-poster.jpg,light-poster.jpg}`.

No backend, database, user identifiers, password compatibility endpoints, secret variables, administration app or courier app were changed. Existing backend health was verified over the production HTTPS API. No new WhatsApp message was sent during UI tests; browser tests intercepted authentication requests locally.

## Validation

Passed TypeScript checking and Expo export for Android, iOS and web. Passed customer OTP, startup, search/update lifecycle, feature/provider and notification tests, plus root session recovery, OTA compatibility, customer offers and product options regression suites.

Coverage includes invalid/incomplete codes, automatic submit, duplicate prevention, first/next/backspace focus, Arabic-digit paste, successful feedback before navigation, failed verification never acknowledging success, existing/new account destinations, presentation failure, resend cooldown, network errors, both themes and reduced motion. Update lifecycle tests cover download completion, repeated background/inactive/active transitions, preexisting pending updates, overlapping checks, unmount, disabled updates, offline retry and cooldown: none calls reload.

Headless Chromium exercised the actual exported app in both themes, with responsive box checks at 320/390px, static logo and invisible startup checks, invalid server responses, automatic verification, success acknowledgement and both account destinations. Native keyboard/autofill and process-death behavior require a physical-device check; lifecycle tests mock native AppState/Expo boundaries rather than claiming native end-to-end coverage.

## Release

Source and publication results are recorded after the production update finishes. The rollback baseline is update group `c496c3df-3800-498a-a682-443112d1e70d` (the preceding video release).

A device still running the preceding bundle retains its previous resume behavior until this corrected bundle first loads. After downloading this release, fully close and reopen the app once to activate it. Subsequent downloads follow the new cold-start-only policy.
