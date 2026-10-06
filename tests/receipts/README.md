Run `node tests/receipts/run.cjs` from the workspace root. Requires .NET 10 and
the installed customer-app dependencies. The runner also detects the local SDK
at `.tools/dotnet/dotnet`.

The test loads the actual customer API and receipt serializer, stubs only the
device file reader, and sends HTTP requests to the actual ASP.NET receipt and
admin review controllers. Receipt metadata uses an isolated EF in-memory database;
file contents use temporary disk storage that is deleted on shutdown. Production
credentials and data are never read. Authentication uses test identities.

Checks include exact binary preservation, protected retrieval, listing for admin
review, rejection/re-upload/approval, expired session refresh, and local file
validation on native and web. This does not substitute for an Android device
check of the native file reader or verify PostgreSQL persistence.
