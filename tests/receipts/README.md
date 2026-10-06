Run `node tests/receipts/run.cjs` from the workspace root. Requires .NET 10 and
the installed customer-app dependencies. The runner also detects the local SDK
at `.tools/dotnet/dotnet`.

The test loads the actual customer/admin API clients and image uploaders, stubs
device file reading/FileReader, and sends HTTP requests to the actual ASP.NET
receipt, catalogue image and admin review controllers. Receipt metadata uses an isolated EF in-memory database;
file contents use temporary disk storage that is deleted on shutdown. Production
credentials and data are never read. Authentication uses test identities.

Checks include exact binary preservation, protected retrieval, listing for admin
review, rejection/re-upload/approval, expired session refresh, and local file
validation on native and web. Catalogue uploads verify JPEG resizing for stores,
products and offers, preserve small transparent PNGs, and mock only the outgoing
Supabase request. Receipt downloads verify admin session refresh and same-origin
token protection. This does not substitute for an Android device
check of the native file reader or verify PostgreSQL persistence.

Run `node tests/admin-payments.cjs` to check actual admin provider/screen behavior:
approval finishes even when background queries never finish, rapid taps are
deduplicated, failed approvals do not alter confirmed amounts, receipt loading
can retry, and customer receipts use the image manipulation/cleanup path.

Run `node tests/receipts/run.cjs --r2` for the same real-controller flow with R2
storage. Only the external S3 boundary is mocked: uploaded catalogue objects
are fetched after the real public image redirect and receipts after their
protected download-link route. Tests assert zero backend object reads during
display and no app Authorization/cookies on the R2 fetch. Startup also checks migration dry-run/verification/retry,
corruption rejection, backup/original preservation, old local receipt reads,
SDK flags, endpoint restrictions, service gateways and dotenv precedence.

Run `node tests/service-gateways.cjs` for the actual mobile registration adapters
and generated Leaflet scripts. Run `node scripts/audit-mobile-env.cjs` to print
only dotenv names/paths and reject app service credentials.
