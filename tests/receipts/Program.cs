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
using SixLabors.ImageSharp.PixelFormats;

// This host runs the actual receipt/review controllers with isolated metadata
// and temporary file storage. It never loads the production database or secrets.
var root = Path.Combine(Path.GetTempPath(), $"bsstore-receipt-test-{Guid.NewGuid():N}");
var r2Mode = Environment.GetEnvironmentVariable("TEST_STORAGE_MODE") == "r2";
var objectClient = new TestR2Client();
var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["Storage:LocalPath"] = root, ["STORAGE_PROVIDER"] = r2Mode ? "r2" : "supabase",
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
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("CatalogueStorage").ConfigurePrimaryHttpMessageHandler(() => new TestCatalogueStorage());
builder.Services.AddScoped<PushNotificationService>();
builder.Services.AddControllers().AddApplicationPart(typeof(PaymentsController).Assembly);
builder.Services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthentication>("Test", _ => { });
builder.Services.AddAuthorization();
builder.Services.AddOutputCache(options => options.AddPolicy("public-images", policy => policy.Expire(TimeSpan.FromDays(1))));
builder.Services.AddRateLimiter(options => options.AddPolicy("public-assets", context =>
    System.Threading.RateLimiting.RateLimitPartition.GetNoLimiter("test")));
var app = builder.Build();
await R2Checks.RunAsync(TestCatalogueStorage.Receipt, Path.Combine(root, "r2-checks"));
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
app.MapGet("/test/catalogue-upload", () =>
{
    var catalogue = objectClient.Objects.Where(x => x.Key.StartsWith("catalogue/")).ToList();
    return r2Mode ? Results.Json(new { UploadCount = catalogue.Count, Size = catalogue.LastOrDefault().Value?.Length, LastMime = "image/jpeg" })
        : Results.Json(new { TestCatalogueStorage.UploadCount, Size = TestCatalogueStorage.LastImage?.Length, TestCatalogueStorage.LastMime });
});
app.MapGet("/test/r2-object/{**key}", (string key, HttpContext context) =>
{
    if (context.Request.Headers.ContainsKey("Authorization")) throw new Exception("App session must never be sent to R2");
    if (context.Request.Query["X-Amz-Signature"] != "test-only" || !objectClient.Objects.TryGetValue(key, out var bytes)) return Results.NotFound();
    return Results.File(bytes, key.EndsWith(".png") ? "image/png" : "image/jpeg");
});
app.MapGet("/test/r2-read-count", () => Results.Json(new { objectClient.GetCount }));

Guid orderId;
Guid paymentId;
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var customer = new Customer { User = new User { Id = TestAuthentication.CustomerId, Phone = "test-only", Role = UserRole.Customer }, FullName = "Receipt test" };
    var address = new Address { Customer = customer };
    var order = new Order { Customer = customer, Address = address, OrderNumber = "RECEIPT-TEST", PaymentMethod = PaymentMethod.ManualTransfer, TotalAmount = 2500 };
    var payment = new Payment { Order = order, Method = PaymentMethod.ManualTransfer, Amount = 2500, TransferProvider = "ALKURAIMI", TransferReference = "test-reference" };
    db.Payments.Add(payment);
    await db.SaveChangesAsync();
    orderId = order.Id;
    paymentId = payment.Id;
}

try
{
    await app.StartAsync();
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { url = app.Urls.Single(), orderId, paymentId, receiptBase64 = Convert.ToBase64String(TestCatalogueStorage.Receipt) }));
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

sealed class TestCatalogueStorage : HttpMessageHandler
{
    public static readonly byte[] Source = MakeImage(3200, 1800);
    public static readonly byte[] Receipt = MakeImage(256, 128);
    public static byte[]? LastImage;
    public static string? LastMime;
    public static int UploadCount;
    private static byte[] MakeImage(int width, int height)
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
        image.Save(stream, new JpegEncoder { Quality = 100 });
        return stream.ToArray();
    }
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        LastImage = await request.Content!.ReadAsByteArrayAsync(ct);
        LastMime = request.Content.Headers.ContentType?.MediaType;
        using var decoded = Image.Load<Rgba32>(LastImage);
        if (decoded.Width > 1600 || decoded.Height > 1600) throw new InvalidOperationException("Original dimensions reached catalogue storage");
        if (!request.Headers.Contains("apikey") || request.Headers.Authorization != null)
            throw new InvalidOperationException("Publishable storage key must use apikey, not Bearer");
        UploadCount++;
        return new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new StringContent("{}") };
    }
}
