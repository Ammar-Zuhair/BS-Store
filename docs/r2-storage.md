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
Public `GET /api/images/{folder}/{filename}` validates generated catalogue
JPEG/PNG names and returns a 302 redirect to a signed GET URL valid for one hour.
Only the redirect is cached (five minutes); image bodies travel directly from
R2 to the device. The authenticated receipt endpoint checks ownership/admin role
before issuing a one-minute link, with `private, no-store` response headers.
The admin first requests `/api/payments/receipts/{id}/download-link`, then fetches
the signed R2 URL without app Authorization/ngrok headers/cookies. Signing is
local and requires no R2 object download. Permanent signed URLs are never stored
in the database. This does not configure a Cloudflare CDN/custom domain.
Uploads still pass through the backend for validation/compression. Full object
reads on the server are reserved for migration verification or unmigrated local
receipt compatibility, rather than normal R2 display.

`APP_PUBLIC_URL` is the public HTTPS origin of the backend, without `/api`,
used for stable image URLs. It is already set in the local backend environment.
All credentials are loaded from process environment or the workspace/project
`.env` before backend defaults, including services restarted by systemd.
Existing process values take precedence over dotenv. Backend `.env` is ignored
by Git. No storage configuration needs to be added to mobile apps/EAS.

New catalogue/receipt uploads are R2-only. Missing `R2_BUCKET_NAME`, an invalid
configuration, or `STORAGE_PROVIDER=supabase` rejects uploads rather than storing
files elsewhere. R2 enables automatically when the bucket is configured;
`STORAGE_PROVIDER=r2` enables explicitly. Legacy local receipts remain readable
only for compatibility/migration; Supabase settings serve migration reads only.

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
origins and the fixed `images.unsplash.com` allowlist for existing public catalogue
photos. Local-device `file:`/`content:` store references are reported for manual
re-upload; their bytes cannot be recovered by the server. Copies are verified by SHA-256 after an R2 read before each record is
updated. Shared source URLs are deduplicated, deterministic names allow retries,
and already migrated references are skipped. Private local receipts are also
copied and verified; their protected API URLs remain unchanged. No originals
are deleted and no database migration/schema change is required.

Before changes, references are backed up with mode 0600 under
`/workspace/backend/storage-migrations/`, excluded from Git. If a file cannot
be read or verified, the migration stops; already completed records remain
valid and it can be rerun. This copies referenced files, not orphaned objects
with no database reference. Supabase downloads during migration still incur
any applicable source-side usage. The operator verifies live credentials before
applying the production migration.

Production activation on 2026-10-06 verified object upload/read, signed direct
download, and blocked unsigned access using the supplied Secrets; test objects
were deleted. The backend was published/restarted and 25 legacy references were
copied with hash verification, retaining their originals and a private reference
backup. A public catalogue URL returned 302 with an empty body, followed by a
successful image download directly from R2. Receipt authorization and credential
isolation were verified in isolated controller/client tests; no device or EAS
publish was performed. Browser CORS was absent during the live check; configure
the rule below before using direct receipt downloads in a browser build.

A subsequent read-only audit confirmed R2 is enabled, all three existing payment
receipts have R2 keys, and store/product/offer references contain no legacy
Supabase storage URLs. The currently unused customer-profile/purchase-receipt
image fields were empty. New uploads are now explicitly R2-only, including
server-side conservative receipt normalization; original migrated objects remain
unchanged. Synthetic image tests verified JPEG size reduction, lossless PNG text
pixels, orientation, processed database metadata and protection from repeated
lossy encoding. They do not establish readability for every customer's photo.
The broader audit also found public Unsplash references and one inaccessible
local-device store image for `ملابس رجالي وولادي`. The migration supports the
existing Unsplash photos; the local-only reference needs the original image
re-uploaded from the admin app and is left unchanged rather than replaced with
an unrelated picture.
Five additional Unsplash field references were copied with hash verification and
switched to R2. A final read-only audit found no remaining external product/offer
references; the only remaining non-R2 catalogue reference is that inaccessible
local store file. The API was republished and passed local/public health checks.

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

Validation: `node scripts/audit-mobile-env.cjs`, `node tests/receipts/run.cjs`.
`--r2` is a compatible alias; all new uploads use R2 in both runs. Tests use a mocked S3 boundary, isolated
in-memory metadata, and temporary local files, covering compression, public
catalogue redirects without backend body reads, private receipt authorization, direct authenticated link issuance without forwarding app credentials, dry-run/migration/retry,
corruption protection and SDK settings. Live R2 connectivity requires the keys.

## Browser-only CORS

Native Android/iOS downloads do not require browser CORS. If a web version uses
JavaScript to read receipt bytes, R2 needs a read-only CORS rule such as:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "ExposeHeaders": ["ETag", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Configure this in the bucket settings if it is absent, keeping any existing
rules. It grants no public access: every object read still requires the signed
URL. Object Read & Write credentials may lack permission to manage bucket CORS;
that configuration uses the dashboard or an appropriately scoped management
API token, not mobile app keys.
