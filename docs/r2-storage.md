# R2 storage and mobile environment audit

The backend alone connects to R2's S3 API. Required project Secrets:

| Secret name | Value |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | R2 Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | R2 Secret Access Key |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ENDPOINT_URL` | HTTPS S3 endpoint from R2, not a public image URL |
| `R2_BUCKET_NAME` | Existing private bucket name |

`R2_ENDPOINT_URL` defaults to `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`
when omitted. Credentials need Object Read & Write on this bucket. The backend
does not create buckets or need a Cloudflare control-plane Token value.
`CLOUDFLARE_API_TOKEN` is needed only if dashboard/bucket configuration is later
automated, and is not used by this storage implementation.

Keep this bucket private (disable public r2.dev/custom-domain access), since it
also holds receipts. Catalogue objects live under `catalogue/products`,
`catalogue/stores`, and `catalogue/offers`; receipts live under `private/receipts`.
Public `GET /api/images/{folder}/{filename}` exposes only catalogue JPEG/PNG
objects with validated generated names and cache headers. The authenticated
receipt endpoint retains its ownership/admin checks. No S3 credentials or
permanent public receipt URLs are sent to clients. Images pass through the
backend; this does not create a Cloudflare CDN/custom domain or eliminate the
backend's own bandwidth use.

`APP_PUBLIC_URL` is the public HTTPS origin of the backend, without `/api`,
used for stable image URLs. It is already set in the local backend environment.
All credentials are loaded from process environment or the workspace/project
`.env` before backend defaults, including services restarted by systemd.
Existing process values take precedence over dotenv. Backend `.env` is ignored
by Git. No storage configuration needs to be added to mobile apps/EAS.

Without `R2_BUCKET_NAME`, existing backend-only Supabase uploads remain active
and receipts remain local. Adding R2 credentials and `R2_BUCKET_NAME`, then
restarting the service, enables R2 automatically. `STORAGE_PROVIDER=supabase`
is an explicit temporary rollback; `STORAGE_PROVIDER=r2` enables explicitly.
An invalid/partial R2 configuration fails uploads visibly rather than silently
writing to another provider. Legacy receipts stay readable from local storage.

## Existing file migration

After adding secrets and verifying a test upload/read, run:

```bash
/workspace/scripts/migrate-images.sh --dry-run
/workspace/scripts/migrate-images.sh --apply
```

Use a quiet maintenance period for applying the migration so catalogue image
references are not edited concurrently. The CLI reads referenced store/product
images and recursively finds image fields in `FlashDeals` (including bundles).
It accepts public storage sources only from the configured legacy Supabase
origins. Copies are verified by SHA-256 after an R2 read before each record is
updated. Shared source URLs are deduplicated, deterministic names allow retries,
and already migrated references are skipped. Private local receipts are also
copied and verified; their protected API URLs remain unchanged. No originals
are deleted and no database migration/schema change is required.

Before changes, references are backed up with mode 0600 under
`/workspace/backend/storage-migrations/`, excluded from Git. If a file cannot
be read or verified, the migration stops; already completed records remain
valid and it can be rerun. This copies referenced files, not orphaned objects
with no database reference. Supabase downloads during migration still incur
any applicable source-side usage. The production migration has not run yet.

## Completed environment audit

All dotenv files under these apps were checked, including examples:

- `admin-app/.env` and `admin-app/.env.example`: removed Supabase URL/key/bucket,
  CARTO key and Boosthis project key.
- `customer-app/.env` and `.env.example`: removed CARTO and Boosthis keys.
- `courier-app/.env` and `.env.example`: removed CARTO and Boosthis keys.
- All three `boosthis.config.json` files: removed ingest token/invite key fields.

The backend `.env` already holds database, JWT signing, and backend-monitoring
configuration. Required mobile service values were copied locally to:
`CARTO_API_KEY`, `BOOSTHIS_ADMIN_PROJECT_KEY`, `BOOSTHIS_CUSTOMER_PROJECT_KEY`,
and `BOOSTHIS_COURIER_PROJECT_KEY`. The deployed Supabase storage configuration
was preserved as `LEGACY_SUPABASE_STORAGE_URL`, `LEGACY_SUPABASE_STORAGE_KEY`,
`LEGACY_SUPABASE_STORAGE_BUCKET`; this matters because the database/storage
project configuration was previously resolved differently. There are no
remaining app environment files that need moving wholesale to the backend.

Maps request fixed backend tile routes; the backend adds the CARTO key.
Boosthis registration uses a fixed backend gateway that adds each app's project
key. Only per-install session tokens stay on the device; they are distinct from
service-wide secrets, like the necessary user's login access/refresh tokens.
No vendored Boosthis package files were edited. App API origins and Expo project
IDs remain public. The root `EXPO_TOKEN` is a build-tool credential and is not a
backend runtime key or an app variable; no EAS account operations were performed.

Remove obsolete `EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_CARTO_API_KEY`,
`EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY` (and any RN override/ingest secrets) from EAS
environments as well. Values already shipped in older APK/OTA bundles cannot be
erased by changing this checkout. Publish OTA for all three apps for the new
service gateways. Review/revoke old service credentials after cutover as needed.

Validation: `node scripts/audit-mobile-env.cjs`, `node tests/receipts/run.cjs`
and `node tests/receipts/run.cjs --r2`. R2 tests use a mocked S3 boundary, isolated
in-memory metadata, and temporary local files, covering compression, public
catalogue reads, private receipt authorization, dry-run/migration/retry,
corruption protection and SDK settings. Live R2 connectivity requires the keys.
