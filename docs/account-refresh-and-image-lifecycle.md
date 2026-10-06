# Account, refresh and image lifecycle

Every app header provides a refresh action and loading indicator. Customer refresh reloads catalogue, order history, addresses and the authenticated account name without changing the selected screen/order. Courier header actions occupy their own row to keep logout and refresh usable on small screens.

Customer Account uses Tajawal for all labels, fields and buttons. It exposes saved-address editing/deletion, current-password protected password changes, administration support and application/developer information. WhatsApp links use Yemen's +967 country code. Password changes revoke old refresh sessions and issue a new session for the current device. The authenticated account endpoint loads the actual name from the customer/driver/user record.

Address editing creates a replacement address if an order already uses the existing address. The original is archived and retained for existing order delivery/history. Deletion archives the address and promotes another saved address if necessary. Checkout excludes archived addresses.

Catalogue image selection is local. Images are optimized and uploaded to R2 when the store/product/offer form is submitted. Existing stored image URLs are reused, and newly uploaded files are scheduled for cleanup if the record save fails. Customer checkout already stages receipts locally; the order-detail screen now also separates choosing/replacing an image from pressing **إرسال الإيصال**.

Deleting stores/products and saving changed offers records image cleanup jobs in the same database save as the catalogue change. Store deletion hides its products and retains historical store/order data. A background worker checks live store/product/offer references every 15 seconds and deletes only unreferenced R2 catalogue objects. Shared images stay until their final reference is removed. Failed R2 deletes remain in the queue for retry after a restart. Receipt audit images are outside this cleanup scope. Replacing/removing a saved catalogue image also queues the old image for cleanup.

## Android installation

The local `bsstore-app-exit` Expo module closes/removes the task and terminates this app's process after explicit confirmation. It does not perform Android's system-level force-stop operation. Older native builds retain the React Native fallback; the complete exit behavior requires a newly built APK. No iOS process-exit implementation is included.

All three app versions are now `1.0.1`. The existing `appVersion` runtime policy separates these builds from the previous `1.0.0` OTA runtime. Build each app from its directory:

```sh
eas build --platform android --profile production
```

After installing these builds, future compatible JS-only changes can be published to their `production` channel. EAS build/update commands are left for the project owner to run.

## Checks

```sh
node tests/account-and-image-drafts.cjs
DOTNET_CLI_HOME=/tmp/bsstore-dotnet-cli node tests/receipts/run.cjs --r2
node customer-app/tests/order-hours-and-navigation.cjs
```

TypeScript checks use `--ignoreDeprecations 6.0` because the existing tsconfig includes `baseUrl`. Expo autolinking detects the exit module in all three apps. Android native compilation and physical-device exit behavior require the APK build/device verification.

## Compatible OTA hotfixes

Customer order timestamps display the full Gregorian date and time in `Asia/Aden`, both after creation and when reloading history/details. Empty or malformed server timestamps remain empty instead of displaying an invalid date.

For compatible JS changes, admin/customer configuration accepts an explicit `BSSTORE_OTA_RUNTIME_VERSION=1.0.0` or `1.0.1` override. This setting is only for OTA publication: EAS native builds reject it and otherwise retain the `appVersion` policy. Publish each runtime separately when both are in use, with the project's `production` environment/channel. The optional exit module continues to use its legacy fallback on binaries that do not contain it.

Older Android/iOS binaries without SecureStore keep their existing session-token storage instead of failing during module import. Binaries that include SecureStore continue to encrypt tokens and migrate/delete the legacy copy; failures of an available SecureStore are not silently downgraded.

```sh
BSSTORE_OTA_RUNTIME_VERSION=1.0.0 eas update --channel production --environment production --message "Full order dates and account improvements" --non-interactive
BSSTORE_OTA_RUNTIME_VERSION=1.0.1 eas update --channel production --environment production --message "Full order dates and account improvements" --non-interactive
```

The compatibility and midnight-rollover checks run with `node tests/ota-compatibility.cjs`.
