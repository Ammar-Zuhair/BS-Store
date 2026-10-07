using System.Security.Claims;
using System.Text.Encodings.Web;
using BSStore.API.Controllers;
using BSStore.API.Services;
using BSStore.Application.Common.Interfaces;
using BSStore.Domain.Entities;
using BSStore.Domain.Enums;
using BSStore.Infrastructure.Data;
using BSStore.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;

// This host runs the actual receipt/review controllers with isolated metadata
// and temporary file storage. It never loads the production database or secrets.
var root = Path.Combine(Path.GetTempPath(), $"bsstore-receipt-test-{Guid.NewGuid():N}");
var objectClient = new TestR2Client();
var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["Storage:LocalPath"] = root, ["STORAGE_PROVIDER"] = "r2",
    ["R2_BUCKET_NAME"] = "test-private-bucket", ["APP_PUBLIC_URL"] = "https://implosive-exchange-compacter.ngrok-free.dev",
    ["LEGACY_SUPABASE_STORAGE_URL"] = "https://storage.test", ["LEGACY_SUPABASE_STORAGE_KEY"] = "sb_publishable_test",
    ["LEGACY_SUPABASE_STORAGE_BUCKET"] = "Product Images"
});
// Every request must share the same isolated in-memory database.
var databaseName = Guid.NewGuid().ToString();
builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName));
builder.Services.AddScoped<LocalStorageService>();
builder.Services.AddScoped<IStorageService, HybridStorageService>();
builder.Services.AddSingleton<Amazon.S3.IAmazonS3>(objectClient);
builder.Services.AddSingleton<R2ObjectStore>();
builder.Services.AddSingleton<R2Settings>();
builder.Services.AddScoped<CatalogueStorageService>();
builder.Services.AddScoped<CatalogueImageCleanup>();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("CatalogueStorage");
builder.Services.AddScoped<PushNotificationService>();
builder.Services.AddControllers().AddApplicationPart(typeof(PaymentsController).Assembly);
builder.Services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthentication>("Test", _ => { });
builder.Services.AddAuthorization();
builder.Services.AddOutputCache(options => options.AddPolicy("public-images", policy => policy.Expire(TimeSpan.FromDays(1))));
builder.Services.AddRateLimiter(options => options.AddPolicy("public-assets", context =>
    System.Threading.RateLimiting.RateLimitPartition.GetNoLimiter("test")));
var app = builder.Build();
await AccountAndCatalogueChecks.RunAsync();
await AccountDeletionChecks.RunAsync();
await R2Checks.RunAsync(TestCatalogueStorage.Receipt, Path.Combine(root, "r2-checks"));
// Validate conservative receipt compression and avoid repeated lossy encoding.
await using (var source = new MemoryStream(TestCatalogueStorage.Source))
{
    var result = await ReceiptImageOptimizer.OptimizeAsync(source, CancellationToken.None);
    using var image = Image.Load(result.Bytes);
    if (Math.Max(image.Width, image.Height) != 2200 || result.Bytes.Length >= TestCatalogueStorage.Source.Length
        || image.Metadata.GetJpegMetadata().Quality > 85)
        throw new Exception("Original/high-quality receipts must be reduced before R2 storage");
}
await using (var source = new MemoryStream(TestCatalogueStorage.Receipt))
{
    var result = await ReceiptImageOptimizer.OptimizeAsync(source, CancellationToken.None);
    if (!result.Bytes.SequenceEqual(TestCatalogueStorage.Receipt)) throw new Exception("Suitable JPEG receipts must not be recompressed");
}
using (var scan = new Image<Rgba32>(360, 720, new Rgba32(255, 255, 255)))
{
    // Sharp black strokes on white model digital receipt text/amounts.
    scan.ProcessPixelRows(rows =>
    {
        for (var y = 20; y < 700; y++)
            if (y % 30 < 3) for (var x = 20; x < 340; x++) rows.GetRowSpan(y)[x] = new Rgba32(0, 0, 0);
    });
    await using var input = new MemoryStream();
    await scan.SaveAsync(input, new PngEncoder { CompressionLevel = PngCompressionLevel.NoCompression });
    TestCatalogueStorage.ReceiptPng = input.ToArray();
    var originalSize = input.Length; input.Position = 0;
    var optimized = await ReceiptImageOptimizer.OptimizeAsync(input, CancellationToken.None);
    using var decoded = Image.Load<Rgba32>(optimized.Bytes);
    if (optimized.MimeType != "image/png" || decoded.Width != 360 || decoded.Height != 720 || optimized.Bytes.Length >= originalSize)
        throw new Exception("PNG receipt compression must retain format/size and reduce bytes");
    for (var y = 0; y < scan.Height; y++) for (var x = 0; x < scan.Width; x++)
        if (scan[x, y] != decoded[x, y]) throw new Exception("PNG receipt text must retain exact pixels");
}
using (var rotated = new Image<Rgb24>(20, 40))
{
    rotated.Metadata.ExifProfile = new ExifProfile();
    rotated.Metadata.ExifProfile.SetValue(ExifTag.Orientation, (ushort)6);
    await using var input = new MemoryStream(); await rotated.SaveAsJpegAsync(input); input.Position = 0;
    var result = await ReceiptImageOptimizer.OptimizeAsync(input, CancellationToken.None);
    using var decoded = Image.Load(result.Bytes);
    if (decoded.Width != 40 || decoded.Height != 20 || decoded.Metadata.ExifProfile != null)
        throw new Exception("Receipt orientation must be applied before stripping metadata");
}
Console.WriteLine("PASS receipt size/quality policy, no repeated JPEG loss, exact PNG text pixels and orientation");
// Verify that already small and transparent images preserve dimensions/alpha.
using (var transparent = new Image<Rgba32>(16, 12))
{
    await using var png = new MemoryStream();
    transparent.SaveAsPng(png); png.Position = 0;
    var optimized = await CatalogueImageOptimizer.OptimizeAsync(png, CancellationToken.None);
    using var decoded = Image.Load<Rgba32>(optimized.Bytes);
    if (optimized.MimeType != "image/png" || decoded.Width != 16 || decoded.Height != 12 || decoded[0, 0].A != 0)
        throw new InvalidOperationException($"Transparent images must not be flattened or upscaled: {optimized.MimeType}, {decoded.Width}x{decoded.Height}, alpha {decoded[0, 0].A}");
}
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseOutputCache();
app.MapControllers();
app.MapGet("/test/catalogue-source", () => Results.File(TestCatalogueStorage.Source, "image/jpeg"));
app.MapGet("/test/receipt-png-source", () => Results.File(TestCatalogueStorage.ReceiptPng, "image/png"));
app.MapGet("/test/catalogue-upload", () =>
{
    var catalogue = objectClient.Objects.Where(x => x.Key.StartsWith("catalogue/")).ToList();
    return Results.Json(new { UploadCount = catalogue.Count, Size = catalogue.LastOrDefault().Value?.Length, LastMime = "image/jpeg" });
});
app.MapGet("/test/r2-object/{**key}", (string key, HttpContext context) =>
{
    if (context.Request.Headers.ContainsKey("Authorization")) throw new Exception("App session must never be sent to R2");
    if (context.Request.Query["X-Amz-Signature"] != "test-only" || !objectClient.Objects.TryGetValue(key, out var bytes)) return Results.NotFound();
    return Results.File(bytes, key.EndsWith(".png") ? "image/png" : key.EndsWith(".pdf") ? "application/pdf" : "image/jpeg");
});
app.MapGet("/test/r2-read-count", () => Results.Json(new { objectClient.GetCount }));
app.MapGet("/test/receipt-record/{id:guid}", async (Guid id, AppDbContext db) =>
{
    var receipt = await db.PaymentReceipts.FindAsync(id);
    if (receipt == null) return Results.NotFound();
    var bytes = objectClient.Objects[receipt.StorageKey[3..]];
    var info = receipt.MimeType.StartsWith("image/") ? Image.Identify(bytes) : null;
    return Results.Json(new { receipt.StorageKey, receipt.MimeType, receipt.FileSize, Width = info?.Width, Height = info?.Height });
});

Guid orderId;
Guid paymentId;
Guid compressionOrderId;
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var customer = new Customer { User = new User { Id = TestAuthentication.CustomerId, Phone = "test-only", Role = UserRole.Customer }, FullName = "Receipt test" };
    var address = new Address { Customer = customer };
    var order = new Order { Customer = customer, Address = address, OrderNumber = "RECEIPT-TEST", PaymentMethod = PaymentMethod.ManualTransfer, TotalAmount = 2500 };
    var payment = new Payment { Order = order, Method = PaymentMethod.ManualTransfer, Amount = 2500, TransferProvider = "ALKURAIMI", TransferReference = "test-reference" };
    db.Payments.Add(payment);
    var compressionOrder = new Order { Customer = customer, Address = address, OrderNumber = "COMPRESSION-TEST", PaymentMethod = PaymentMethod.ManualTransfer, TotalAmount = 2500 };
    db.Payments.Add(new Payment { Order = compressionOrder, Method = PaymentMethod.ManualTransfer, Amount = 2500 });
    await db.SaveChangesAsync();
    orderId = order.Id;
    paymentId = payment.Id;
    compressionOrderId = compressionOrder.Id;
}

try
{
    await app.StartAsync();
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { url = app.Urls.Single(), orderId, paymentId, compressionOrderId, receiptBase64 = Convert.ToBase64String(TestCatalogueStorage.Receipt) }));
    await app.WaitForShutdownAsync();
}
finally
{
    await app.DisposeAsync();
    if (Directory.Exists(root)) Directory.Delete(root, true);
}

sealed class TestAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public static readonly Guid CustomerId = Guid.NewGuid();
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var token = Request.Headers.Authorization.ToString();
        var role = token == "Bearer test-admin" ? "Admin" : "Customer";
        if (token is not ("Bearer test-customer" or "Bearer test-admin" or "Bearer test-other"))
            return Task.FromResult(AuthenticateResult.NoResult());
        var id = token == "Bearer test-customer" ? CustomerId : Guid.Parse("00000000-0000-0000-0000-000000000001");
        var identity = new ClaimsIdentity([new Claim("userId", id.ToString()), new Claim(ClaimTypes.Role, role)], Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
    }
}

static class TestCatalogueStorage
{
    public static readonly byte[] Source = MakeImage(3200, 1800);
    public static readonly byte[] Receipt = MakeImage(256, 128, 85);
    public static byte[] ReceiptPng = [];
    private static byte[] MakeImage(int width, int height, int quality = 100)
    {
        using var image = new Image<Rgb24>(width, height);
        image.ProcessPixelRows(rows =>
        {
            for (var y = 0; y < height; y++)
            {
                var row = rows.GetRowSpan(y);
                for (var x = 0; x < width; x++) row[x] = new Rgb24((byte)(x % 256), (byte)(y % 256), (byte)((x + y) % 256));
            }
        });
        using var stream = new MemoryStream();
        image.Save(stream, new JpegEncoder { Quality = quality });
        return stream.ToArray();
    }
}
