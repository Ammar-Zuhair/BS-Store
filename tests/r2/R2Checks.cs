using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using BSStore.API.Services;
using BSStore.Domain.Entities;
using BSStore.Infrastructure.Data;
using BSStore.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using BSStore.API.Controllers;
using BSStore.Infrastructure.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Nodes;

static class R2Checks
{
    public static async Task RunAsync(byte[] jpeg, string root)
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["STORAGE_PROVIDER"] = "r2", ["R2_BUCKET_NAME"] = "test-private-bucket", ["APP_PUBLIC_URL"] = "https://api.test",
            ["Storage:LocalPath"] = root, ["LEGACY_SUPABASE_STORAGE_URL"] = "https://storage.test",
            ["STORAGE_MIGRATION_BACKUP_DIR"] = Path.Combine(root, "backups")
        }).Build();
        var settings = new R2Settings(cfg);
        var client = new TestR2Client();
        var remote = new R2ObjectStore(client, settings);
        var local = new LocalStorageService(cfg);
        var services = new ServiceCollection().AddSingleton(remote).BuildServiceProvider();
        var hybrid = new HybridStorageService(local, settings, services);
        await using var bytes = new MemoryStream(jpeg);
        var oldKey = await local.UploadFileAsync(bytes, "receipt.jpg", "image/jpeg", "receipts");
        await using (var old = await hybrid.OpenFileReadAsync(oldKey))
            Check(old != null && await Equal(old, jpeg), "Local receipts remain readable after switching to R2");
        bytes.Position = 0;
        var newKey = await hybrid.UploadFileAsync(bytes, "receipt.jpg", "image/jpeg", "receipts");
        Check(newKey.StartsWith("r2:private/receipts/"), "Private receipt prefix");
        await using (var current = await hybrid.OpenFileReadAsync(newKey)) Check(current != null && await Equal(current, jpeg), "R2 receipt bytes");
        var direct = await hybrid.GetDirectReadUrlAsync(newKey, TimeSpan.FromMinutes(1));
        Check(direct!.Contains("X-Amz-Algorithm=AWS4-HMAC-SHA256") && client.LastExpiry <= DateTime.UtcNow.AddSeconds(61), "Receipt links are signed for at most one minute");
        Check(await hybrid.GetDirectReadUrlAsync(oldKey, TimeSpan.FromMinutes(1)) == null, "Old local receipts use compatibility read until migrated");
        Check(await hybrid.OpenFileReadAsync("r2:../secret") == null, "Storage key traversal rejected");
        Check(!R2ObjectStore.ValidKey("catalogue/receipts/" + Guid.NewGuid().ToString("N") + ".jpg"), "Public catalogue cannot access receipts");
        Check(await hybrid.DeleteFileAsync(newKey) && await hybrid.OpenFileReadAsync(newKey) == null, "R2 deletion and missing file");
        try { _ = settings.CreateClient(); throw new Exception("Missing credentials were accepted"); }
        catch (InvalidOperationException error) { Check(error.Message.Contains("R2_ACCOUNT_ID"), "Missing setting identified without value"); }
        cfg["R2_ACCOUNT_ID"] = new string('a', 32); cfg["AWS_ACCESS_KEY_ID"] = "test-key"; cfg["AWS_SECRET_ACCESS_KEY"] = "test-secret";
        cfg["R2_ENDPOINT_URL"] = "https://untrusted.example";
        try { _ = settings.CreateClient(); throw new Exception("Untrusted endpoint accepted"); }
        catch (InvalidOperationException) { }
        cfg["R2_ENDPOINT_URL"] = null;
        using (var actual = settings.CreateClient()) Check(actual.Config.AuthenticationRegion == "auto", "R2 SDK configuration");

        var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new AppDbContext(options);
        const string source = "https://storage.test/storage/v1/object/public/images/products/old.jpg";
        var store = new Store { ImageKey = source };
        var image = new ProductImage { ImageKey = source, Url = source };
        var deals = new AppSetting { Key = "FlashDeals", Value = "[{\"imageUrl\":\"" + source + "\",\"bundleItems\":[{\"imageUrl\":\"" + source + "\"}]}]" };
        var receipt = new PaymentReceipt { StorageKey = oldKey, MimeType = "image/jpeg", Url = "/api/payments/receipts/protected" };
        db.AddRange(store, image, deals, receipt); await db.SaveChangesAsync();
        var migration = new ImageStorageMigration(db, settings, remote, local, new TestHttpFactory(jpeg), cfg);
        var puts = client.PutCount;
        await migration.RunAsync(false, CancellationToken.None);
        Check(client.PutCount == puts && store.ImageKey == source && receipt.StorageKey == oldKey, "Dry-run does not write objects or references");
        await migration.RunAsync(true, CancellationToken.None);
        Check(store.ImageKey!.StartsWith("https://api.test/api/images/") && image.ImageKey == store.ImageKey && image.Url == store.ImageKey,
            "Migration replaces store and product references, deduplicates shared sources");
        Check(!deals.Value.Contains("storage.test") && deals.Value.Contains("api.test"), "Nested offer images migrated");
        Check(receipt.StorageKey.StartsWith("r2:private/receipts/") && receipt.Url == "/api/payments/receipts/protected", "Protected receipt URL preserved");
        Check(File.Exists(Path.Combine(root, oldKey)) && Directory.GetFiles(Path.Combine(root, "backups")).Length == 1, "Originals and reference backup retained");
        puts = client.PutCount;
        await migration.RunAsync(true, CancellationToken.None);
        Check(client.PutCount == puts, "Migration can be rerun without duplicate uploads");
        store.ImageKey = source; await db.SaveChangesAsync();
        client.CorruptRead = true;
        try { await migration.RunAsync(true, CancellationToken.None); throw new Exception("Corrupted migration accepted"); }
        catch (IOException) { }
        Check(store.ImageKey == source, "Failed verification does not change the reference");
        await CheckGateways(cfg, jpeg);
        var envRoot = Path.Combine(Path.GetTempPath(), "bsstore-env-check-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(envRoot, "backend", "publish"));
        const string variable = "BSSTORE_ENV_LAYER_TEST";
        try
        {
            await File.WriteAllTextAsync(Path.Combine(envRoot, ".env"), variable + "=project-secret\n");
            await File.WriteAllTextAsync(Path.Combine(envRoot, "backend", ".env"), variable + "=older-backend-value\n");
            EnvLoader.Load(Path.Combine(envRoot, "backend", "publish"));
            Check(Environment.GetEnvironmentVariable(variable) == "project-secret", "Project secrets override backend defaults");
            Environment.SetEnvironmentVariable(variable, "exported-secret");
            EnvLoader.Load(Path.Combine(envRoot, "backend", "publish"));
            Check(Environment.GetEnvironmentVariable(variable) == "exported-secret", "Exported secrets override dotenv");
        }
        finally { Environment.SetEnvironmentVariable(variable, null); Directory.Delete(envRoot, true); }
        Console.WriteLine("PASS R2 upload/read/delete, private prefixes, old local receipts, credential validation, dry-run, verified migration, nested offers, deduplication and corruption protection");
    }
    private static async Task CheckGateways(IConfiguration config, byte[] image)
    {
        config["CARTO_API_KEY"] = "private-carto-test";
        config["BOOSTHIS_ADMIN_PROJECT_KEY"] = "private-boosthis-test";
        var factory = new GatewayFactory(image);
        var gateway = new ServiceGatewayController(config, factory) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
        Check(await gateway.Tile(25, 0, 0) is NotFoundResult && factory.Handler.Count == 0, "Invalid tiles rejected before contacting the provider");
        Check(await gateway.Tile(0, 0, 0) is FileContentResult tile && tile.ContentType == "image/png", "Server loads tiles with a backend-only key");
        var result = await gateway.Consent("admin", new JsonObject { ["installId"] = Guid.NewGuid().ToString(), ["runtime"] = "invalid" }, CancellationToken.None);
        var payload = ((JsonResult)result).Value!.ToString()!;
        Check(!payload.Contains("private-boosthis-test") && !payload.Contains("projectKey") && payload.Contains("per-install-token"), "Registration strips service keys and preserves only per-install credentials");
        var requests = factory.Handler.Count;
        Check(await gateway.Consent("other", new JsonObject(), CancellationToken.None) is NotFoundResult && factory.Handler.Count == requests, "Gateway cannot choose arbitrary services");
        Console.WriteLine("PASS backend map/telemetry gateways and secret filtering");
    }
    private static async Task<bool> Equal(Stream stream, byte[] bytes)
    { using var copy = new MemoryStream(); await stream.CopyToAsync(copy); return copy.ToArray().SequenceEqual(bytes); }
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
}
sealed class GatewayFactory(byte[] image) : IHttpClientFactory
{
    public GatewayHandler Handler { get; } = new(image);
    public HttpClient CreateClient(string name) => new(Handler, disposeHandler: false);
}
sealed class GatewayHandler(byte[] image) : HttpMessageHandler
{
    public int Count;
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        Count++;
        if (request.RequestUri!.Host == "basemaps.cartocdn.com")
        {
            if (!request.RequestUri.Query.Contains("key=private-carto-test")) throw new Exception("Missing server-side map key");
            var bytes = new ByteArrayContent(image); bytes.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = bytes };
        }
        if (request.RequestUri.AbsoluteUri != "https://www.boosthis.com/api/installs/consent"
            || request.Headers.Authorization?.Parameter != "private-boosthis-test") throw new Exception("Incorrect registration gateway");
        var body = JsonNode.Parse(await request.Content!.ReadAsStringAsync(ct));
        if (body!["runtime"]!.ToString() != "rn") throw new Exception("Runtime was not constrained");
        return new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new StringContent("{\"projectKey\":\"private-boosthis-test\",\"nested\":{\"inviteKey\":\"private-boosthis-test\"},\"readToken\":\"per-install-token\"}") };
    }
}

sealed class TestR2Client() : AmazonS3Client(new AnonymousAWSCredentials(), new AmazonS3Config { ServiceURL = "https://not-contacted.test" }), IAmazonS3
{
    public readonly Dictionary<string, byte[]> Objects = [];
    public int PutCount;
    public bool CorruptRead;
    public int GetCount;
    public DateTime LastExpiry;
    string IAmazonS3.GetPreSignedURL(GetPreSignedUrlRequest request)
    {
        if (request.Verb != HttpVerb.GET || !R2ObjectStore.ValidKey(request.Key)) throw new Exception("Signing must grant only a single validated GET");
        LastExpiry = request.Expires;
        return "https://" + new string('a', 32) + ".r2.cloudflarestorage.com/test-bucket/" + request.Key
            + "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test-only";
    }
    public override async Task<PutObjectResponse> PutObjectAsync(PutObjectRequest request, CancellationToken ct = default)
    {
        if (request.DisablePayloadSigning != true || request.DisableDefaultChecksumValidation != true || request.UseChunkEncoding || request.AutoCloseStream)
            throw new Exception("R2 incompatible SDK upload flags");
        using var bytes = new MemoryStream(); await request.InputStream.CopyToAsync(bytes, ct);
        Objects[request.Key] = bytes.ToArray(); PutCount++;
        return new PutObjectResponse { HttpStatusCode = System.Net.HttpStatusCode.OK };
    }
    public override Task<GetObjectResponse> GetObjectAsync(GetObjectRequest request, CancellationToken ct = default)
    {
        GetCount++;
        if (!Objects.TryGetValue(request.Key, out var bytes))
            throw new AmazonS3Exception("Missing") { StatusCode = System.Net.HttpStatusCode.NotFound };
        return Task.FromResult(new GetObjectResponse { ResponseStream = new MemoryStream(CorruptRead ? [0, 1, 2] : bytes), ContentLength = bytes.Length });
    }
    public override Task<DeleteObjectResponse> DeleteObjectAsync(DeleteObjectRequest request, CancellationToken ct = default)
    { Objects.Remove(request.Key); return Task.FromResult(new DeleteObjectResponse()); }
}
sealed class TestHttpFactory(byte[] image) : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new(new TestHttpHandler(image));
}
sealed class TestHttpHandler(byte[] image) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        if (request.Method != HttpMethod.Get || request.RequestUri!.Host != "storage.test") throw new Exception("Unexpected migration upstream");
        return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new ByteArrayContent(image) });
    }
}
