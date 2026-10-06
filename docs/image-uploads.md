# Image uploads

Catalogue images (stores, products and offers) use the same admin uploader.
Gallery selections, pasted image URLs and preset selections send image bytes
to `POST /api/admin/images?folder=stores|products|offers`. The authenticated API
decodes actual content, applies orientation, limits the longest side to 1600 px,
encodes opaque images as JPEG at quality 85, and preserves transparency as PNG.
Smaller images are never upscaled. Only optimized bytes reach the existing
storage provider selected by the backend (R2 after credentials are added). Unreadable files and inputs over 15 MiB fail explicitly;
local device URIs are never saved as remotely accessible image URLs.

R2 configuration, protected storage, backend image routes, migration commands and
the mobile credential audit are documented in [r2-storage.md](r2-storage.md).
The legacy Supabase provider is retained during preparation. No storage keys
are present in mobile dotenv files or source integrations.

Customer transfer receipts are converted to JPEG at quality 0.85 with a longest
side of 2200 px before uploading. This path is shared by checkout and re-upload
from order details. The 5 MiB server limit, private storage (R2 when enabled, local otherwise) and payment
metadata remain in effect. PDFs accepted through the API are documents and are
not subjected to lossy image encoding.

The admin downloads protected receipts through its API client, including session
refresh, and displays a data URI from the authenticated response. Native Image
is not responsible for bearer-token renewal. URLs outside the API receipt route
are rejected before sending credentials. Receipt contents aren't disk-cached.

JPEG quality is an encoder setting, not a promised percentage reduction in file
size. Existing stored images aren't changed; the policy applies to new uploads.
Validation commands are documented in `tests/receipts/README.md`.
