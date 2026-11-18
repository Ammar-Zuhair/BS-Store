# Customer app: landscape and Google Play device compatibility

Implemented 2026-11-18. Customer application only; backend, administration and courier apps remain unchanged.

## Native fix

The customer Expo config previously locked the main activity to portrait. Android treats an activity orientation request as an implied hardware requirement. The app now uses Expo `orientation: default`, leaves MainActivity orientation `unspecified`, enables `resizeableActivity`, and declares both `android.hardware.screen.portrait` and `android.hardware.screen.landscape` as optional (`android:required="false"`). The new `withAdaptiveOrientation` config plugin persists this through EAS/prebuild and overrides conflicting library feature requirements during manifest merging.

This change requires a newly built Android App Bundle. An Expo OTA update cannot change an installed binary's manifest or remove Play's device filter. Runtime/app version stays 1.0.2; EAS manages the incremented Android versionCode using the existing production-aab profile and production environment/credentials. No Play Console submission is performed automatically.

References: [Android uses-feature and orientation filtering](https://developer.android.com/guide/topics/manifest/uses-feature-element), [Expo orientation config](https://docs.expo.dev/versions/latest/config/app/#orientation).

## Adaptive UI

- A shared responsive layout reads current window dimensions and safe-area insets on every rotation/window resize. The main content is centered at a maximum 1120dp width. Breakpoints use available dimensions, not fixed device models.
- Short windows (under 500dp of usable height) use a 52dp navigation bar with inline labels and at least 48dp touch targets. Navigation occupies layout space so it cannot cover content; floating cart placement follows the bar height.
- Category grids measure their actual parent and use two, three or four columns (600/960dp thresholds), with exact widths accounting for 12dp gaps.
- Search controls compact in short windows, keeping results visible. Initial type selection and long dialogs remain scrollable.
- All customer native modals allow both landscape directions and portrait. Transparent dialogs respect safe bounds. Product, deal, bundle and terms sheets have bounded widths (760dp); addresses and governorate dialogs are bounded as well. Product hero images shrink in short windows. Deal purchase/store actions are inside the scrollable content so they remain reachable.
- The location picker uses real safe areas instead of a fixed iOS top inset. In landscape windows at least 520dp wide, the map and scrollable address editor appear side by side; portrait retains a map over the editor.
- Rotation does not remount the navigation/authentication tree or clear drafts, OTP input, session or cart state.

## Files

Native: `customer-app/app.json`, `app.config.js`, `plugins/withAdaptiveOrientation.js`.

Layout: `customer-app/App.tsx`, `src/layout/{ResponsiveLayout,ResponsiveLayoutProvider}.tsx`, `src/components/{ResponsiveModal,BottomNav,FloatingCartBar,CategoryGrid,CatalogSearchModal,LocationPickerModal,ProductDetailsModal,BundleOptionsModal,DealDetailsModal,TermsModal,Header,ExitDialog}.tsx`, `src/search/SearchTypeChooser.tsx`, and modal imports in `src/screens/{AuthScreen,ProfileScreen,StoreDetailScreen}.tsx`.

Validation: `customer-app/tests/landscape.cjs`, native-boundary updates in existing tests, `package.json` test:landscape script, and optional `--adaptive-orientation` checks in `scripts/verify-android-manifest.py`.

## Validation and release

Passed TypeScript, customer landscape/OTP/startup/search/features/notification suites, session recovery and OTA compatibility, product options and offer regressions. Android, iOS and web exports succeed. Expo's introspected native manifest contains both optional features and an unlocked, resizable main activity.

Actual exported UI was exercised in headless Chromium in both themes at 390x844, 844x390, 568x320, 1024x768 and 1366x768. Coverage includes home/category/store, search results on a short display, product action reachability, profile/orders, no horizontal overflow and preservation of phone/OTP drafts across rotation. Native device rotation, system keyboard, device cutouts and Play Console device catalog should also be checked on physical hardware/Console; browser checks do not substitute for that.

AAB publication/compiled-manifest results will be recorded when the build finishes. No OTA is being used to claim resolution of this native Play warning.
