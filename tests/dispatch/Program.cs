using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using BSStore.API.Controllers;
using BSStore.API.Services;
using BSStore.Domain.Entities;
using BSStore.Domain.Enums;
using BSStore.Domain.Services;
using BSStore.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

if (args.Contains("--query-diagnostics")) { await ProductionQueryChecks.RunAsync(); return; }
if (args.Contains("--wallet-production-backup")) { await WalletDeploymentChecks.BackupAsync(); return; }
if (args.Contains("--wallet-production-status")) { await WalletDeploymentChecks.StatusAsync(); return; }
if (args.Contains("--options-production-status")) { await OptionsDeploymentChecks.RunAsync(); return; }
if (args.Contains("--probe-production-db")) { await ProductionLatency.RunAsync(); return; }

// Fixed loopback database created by run.sh. No production configuration or credentials are loaded.
const string connection = "Host=127.0.0.1;Port=55432;Database=bsstore_dispatch_test;Username=postgres;Maximum Pool Size=25";
var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole().SetMinimumLevel(LogLevel.Error);
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connection, n => n.EnableRetryOnFailure()));
builder.Services.AddSingleton<FakeExpoHandler>();
builder.Services.AddHttpClient("ExpoPush").ConfigurePrimaryHttpMessageHandler(sp => sp.GetRequiredService<FakeExpoHandler>());
builder.Services.AddScoped<CatalogueImageCleanup>();
builder.Services.AddSingleton(sp => new BSStore.Infrastructure.Services.R2Settings(sp.GetRequiredService<IConfiguration>()));
builder.Services.AddSingleton<Amazon.S3.IAmazonS3>(new Amazon.S3.AmazonS3Client(new Amazon.Runtime.AnonymousAWSCredentials(), new Amazon.S3.AmazonS3Config { ServiceURL = "http://127.0.0.1:1", ForcePathStyle = true }));
builder.Services.AddSingleton<BSStore.Infrastructure.Services.R2ObjectStore>();
builder.Services.AddScoped<PushNotificationService>();
if (args.Contains("--wallet")) builder.Services.AddSingleton<BSStore.Application.Common.Interfaces.IStorageService, WalletTestStorage>();
builder.Services.AddScoped<DriverAssignmentService>();
builder.Services.AddControllers().AddApplicationPart(typeof(CheckoutController).Assembly);
builder.Services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthentication>("Test", _ => { });
builder.Services.AddAuthorization();
var app = builder.Build();
app.UseMiddleware<BSStore.API.Middleware.ExceptionHandlingMiddleware>();
app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
var governorate = new Governorate { Name = "Dispatch test" };
var otherGovernorate = new Governorate { Name = "Other test" };
var category = new Category { Name = "Test", IconName = "test" };
var near = new Store { Name = "Near", Latitude = 15, Longitude = 44.01m, Governorate = governorate, Is24Hours = true };
var far = new Store { Name = "Far", Latitude = 15, Longitude = 44.10m, Governorate = governorate, Is24Hours = true };
var product = new Product { Name = "Test product", Store = near, Category = category, SellingPrice = 100, ExpectedPurchasePrice = 80, SourceType = SourceType.ExternalStore };
var farProduct = new Product { Name = "Far product", Store = far, Category = category, SellingPrice = 100, ExpectedPurchasePrice = 80, SourceType = SourceType.ExternalStore };
var customer = new Customer { FullName = "Test customer", Governorate = governorate,
    User = new User { FullName = "Test customer", Phone = "test-customer", PasswordHash = "test", Role = UserRole.Customer } };
var address = new Address { Customer = customer, City = "Test", District = "Test", Street = "Test", Latitude = 15, Longitude = 44 };
Driver MakeDriver(string name, decimal longitude, DateTime? fix = null, DriverStatus status = DriverStatus.Online) =>
    new() { FullName = name, Phone = name, Governorate = governorate.Id == Guid.Empty ? governorate : null, GovernorateId = governorate.Id == Guid.Empty ? null : governorate.Id, Status = status, Latitude = 15, Longitude = longitude,
        LocationUpdatedAt = fix ?? DateTime.UtcNow, User = new User { FullName = name, Phone = name, PasswordHash = "test", Role = UserRole.Driver } };
var closestNear = MakeDriver("closest-near", 44.011m);
var closestFar = MakeDriver("closest-far", 44.101m);
var stale = MakeDriver("stale", 44.01m, DateTime.UtcNow.AddMinutes(-4));
var offline = MakeDriver("offline", 44.01m, status: DriverStatus.Offline);
var inactive = MakeDriver("inactive", 44.01m); inactive.User.IsActive = false;
var wrongRegion = MakeDriver("wrong-region", 44.01m); wrongRegion.Governorate = otherGovernorate;
var missing = MakeDriver("missing", 44.01m); missing.Latitude = null; missing.Longitude = null; missing.LocationUpdatedAt = null;
var drivers = new[] { closestNear, closestFar, stale, offline, inactive, wrongRegion, missing };
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    db.AddRange(product, farProduct, address); db.AddRange(drivers);
    db.PaymentSettings.Add(new PaymentSettings { CashOnDeliveryLimit = 50000 });
    await db.SaveChangesAsync();
}

Order MakeOrder(OrderStatus status, params Store[] stores) => new() { OrderNumber = Guid.NewGuid().ToString("N")[..20],
    CustomerId = customer.Id, AddressId = address.Id, Status = status,
    SubOrders = stores.Select(s => new SubOrder { StoreId = s.Id }).ToList() };
async Task<Order> AddOrder(OrderStatus status, params Store[] stores)
{
    using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var order = MakeOrder(status, stores); db.Orders.Add(order); await db.SaveChangesAsync(); return order;
}
async Task<bool> Assign(Guid id, Guid? manual = null)
{
    using var scope = app.Services.CreateScope();
    return await scope.ServiceProvider.GetRequiredService<DriverAssignmentService>().TryAssignAsync(id, default, manual);
}
async Task<Order> Read(Guid id)
{
    using var scope = app.Services.CreateScope(); return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Orders.AsNoTracking().FirstAsync(o => o.Id == id);
}
void Check(bool pass, string name) { if (!pass) throw new Exception(name); Console.WriteLine("PASS " + name); }
Check(DriverProximityRules.TargetStore([near, far], address) == far, "multi-store target is farthest from customer");
Check(DriverProximityRules.DistanceKm(15, 44, 15, 44) == 0, "zero distance");
Check(DriverProximityRules.TargetStore([new Store()], address) == null, "missing store coordinates are not assigned");
Check(!DriverProximityRules.IsValidCoordinate(91, 44) && !DriverProximityRules.IsValidCoordinate(0, 0), "invalid coordinates rejected");
var single = await AddOrder(OrderStatus.SearchingDriver, near);
Check(await Assign(single.Id) && (await Read(single.Id)).DriverId == closestNear.Id, "nearest fresh available courier wins for a single store");
var multi = await AddOrder(OrderStatus.Confirmed, near, far);
Check(await Assign(multi.Id) && (await Read(multi.Id)).DriverId == closestFar.Id, "nearest courier to farthest store wins for multiple stores");
var waiting = await AddOrder(OrderStatus.SearchingDriver, near);
Check(!await Assign(waiting.Id), "busy, stale, inactive, offline, missing-location and other-region couriers excluded");
foreach (var status in new[] { OrderStatus.PendingAdminApproval, OrderStatus.PendingPayment, OrderStatus.PaymentPendingVerification, OrderStatus.Cancelled })
    Check(!await Assign((await AddOrder(status, near)).Id), $"automatic assignment cannot bypass {status}");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Drivers.Where(d => d.Id == missing.Id).ExecuteUpdateAsync(s => s.SetProperty(d => d.LocationUpdatedAt, DateTime.UtcNow)
        .SetProperty(d => d.Latitude, 15m).SetProperty(d => d.Longitude, 44.02m));
}
var raceOrders = new List<Order>();
for (var i = 0; i < 12; i++) raceOrders.Add(await AddOrder(OrderStatus.SearchingDriver, near));
var race = await Task.WhenAll(raceOrders.Select((o, i) => Assign(o.Id, i % 2 == 0 ? missing.Id : null)));
Check(race.Count(x => x) == 1, "12 simultaneous automatic/manual assignments reserve an available courier exactly once");
Check(!await Assign(single.Id), "assignment is idempotent");

await app.StartAsync();
var url = app.Urls.Single();
using var http = new HttpClient { BaseAddress = new Uri(url), Timeout = TimeSpan.FromSeconds(90) };
if (args.Contains("--wallet")) { await WalletChecks.RunAsync(app, http, Check); await app.StopAsync(); return; }
HttpRequestMessage Request(HttpMethod method, string path, Guid user, string role, object? body = null)
{
    var request = new HttpRequestMessage(method, path); request.Headers.Add("X-Test-User", user.ToString());
    request.Headers.Add("X-Test-Role", role); if (body != null) request.Content = JsonContent.Create(body); return request;
}
using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Drivers.Where(d => d.Id == closestNear.Id)
        .ExecuteUpdateAsync(s => s.SetProperty(d => d.LocationUpdatedAt, DateTime.UtcNow));
var locationPayload = new { latitude = 15m, longitude = 44.05m, recordedAt = DateTime.UtcNow };
var reports = await Task.WhenAll(Enumerable.Range(0, 10).Select(async _ =>
{
    using var request = Request(HttpMethod.Put, "/api/driver/location", closestNear.User.Id, "Driver", locationPayload);
    using var response = await http.SendAsync(request); response.EnsureSuccessStatusCode();
    using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
    return json.RootElement.GetProperty("data").GetProperty("updated").GetBoolean();
}));
// Previous fresh location is still within the one-minute server window.
Check(reports.Count(x => x) == 0, "repeated GPS reports within a minute do not write to the database");
using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Drivers.Where(d => d.Id == closestNear.Id)
        .ExecuteUpdateAsync(s => s.SetProperty(d => d.LocationUpdatedAt, DateTime.UtcNow.AddMinutes(-1.1)));
reports = await Task.WhenAll(Enumerable.Range(0, 10).Select(async _ =>
{
    using var request = Request(HttpMethod.Put, "/api/driver/location", closestNear.User.Id, "Driver", new { latitude = 15m, longitude = 44.05m, recordedAt = DateTime.UtcNow });
    using var response = await http.SendAsync(request); response.EnsureSuccessStatusCode();
    using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()); return json.RootElement.GetProperty("data").GetProperty("updated").GetBoolean();
}));
Check(reports.Count(x => x) == 1, "10 concurrent GPS reports produce only one write after a minute");
foreach (var (payload, status) in new[] {
    (new { latitude = 91m, longitude = 44m, recordedAt = DateTime.UtcNow }, HttpStatusCode.BadRequest),
    (new { latitude = 15m, longitude = 44m, recordedAt = DateTime.UtcNow.AddMinutes(-5) }, HttpStatusCode.BadRequest) })
{
    using var request = Request(HttpMethod.Put, "/api/driver/location", closestNear.User.Id, "Driver", payload);
    using var response = await http.SendAsync(request); Check(response.StatusCode == status, "GPS rejects invalid or old fixes");
}
using (var request = Request(HttpMethod.Put, "/api/driver/location", customer.User.Id, "Customer", locationPayload))
using (var response = await http.SendAsync(request)) Check(response.StatusCode == HttpStatusCode.Forbidden, "customer cannot update a courier's location");
using (var request = Request(HttpMethod.Put, "/api/driver/location", offline.User.Id, "Driver", locationPayload))
using (var response = await http.SendAsync(request)) Check(response.StatusCode == HttpStatusCode.Conflict, "offline courier cannot report location");

using (var request = Request(HttpMethod.Post, $"/api/orders/{single.Id}/cancel", customer.User.Id, "Customer", new { reasonCode = "CUSTOMER_REQUEST" }))
using (var response = await http.SendAsync(request)) Check(response.IsSuccessStatusCode, "customer can cancel an assigned order");
Check(await Assign(waiting.Id) && (await Read(waiting.Id)).DriverId == closestNear.Id,
    "cancellation releases courier reservation and waiting orders can be retried");

// Exercise busy rules through the real admin/driver endpoints, not only the service.
using (var scope = app.Services.CreateScope()) {
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    Check(await db.Drivers.AnyAsync(d => d.Id == closestFar.Id && d.Status == DriverStatus.Busy), "assignment reserves the courier as Busy before acceptance");
}
using (var request = Request(HttpMethod.Put, $"/api/driver/orders/{multi.Id}/accept", closestFar.User.Id, "Driver"))
using (var response = await http.SendAsync(request)) Check(response.IsSuccessStatusCode, "accepting an assigned order starts its task");
Check((await Read(multi.Id)).Status == OrderStatus.Purchasing, "accepted task moves to Purchasing");
foreach (var status in new[] { 0, 1 }) {
    using var request = Request(HttpMethod.Put, "/api/driver/status", closestFar.User.Id, "Driver", new { status });
    using var response = await http.SendAsync(request);
    Check(response.StatusCode == HttpStatusCode.Conflict, "active courier cannot reset status to Online/Offline");
}
var extra = await AddOrder(OrderStatus.PendingAdminApproval, near);
using (var request = Request(HttpMethod.Post, $"/api/admin/orders/{extra.Id}/assign-driver", customer.User.Id, "Admin", new { driverId = closestFar.Id }))
using (var response = await http.SendAsync(request)) Check(response.StatusCode == HttpStatusCode.Conflict, "manager endpoint rejects assignment to a Busy courier");
Check(!await Assign(extra.Id, closestFar.Id), "manual service also refuses a Busy courier");
await PerformanceChecks.RunAsync(app, http, customer, closestFar, Check);
using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Orders.Where(o => o.Id == multi.Id)
        .ExecuteUpdateAsync(set => set.SetProperty(o => o.Status, OrderStatus.OutForDelivery));
using (var request = Request(HttpMethod.Put, $"/api/driver/orders/{multi.Id}/delivered", closestFar.User.Id, "Driver", new { cashAdjustmentSettled = true }))
using (var response = await http.SendAsync(request)) Check(response.IsSuccessStatusCode, "courier can complete the final delivery");
using (var scope = app.Services.CreateScope()) Check(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Drivers.AnyAsync(d => d.Id == closestFar.Id && d.Status == DriverStatus.Online), "completing the final task makes courier available again");
Check(await Assign(extra.Id, closestFar.Id), "available courier can receive a new order after completion");


await OptionsChecks.RunAsync(app, http, customer, near, category, Check);

if (args.Contains("--benchmark"))
{
    // Real checkout controller and PostgreSQL writes; test auth and local DB are explicit measurement limitations.
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        for (var i = 0; i < 10; i++) db.Orders.Add(MakeOrder(OrderStatus.Delivered, near));
        await db.SaveChangesAsync();
    }
    var results = new List<object>();
    foreach (var concurrency in new[] { 10, 25, 50, 100 })
    {
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            // A fresh pool of couriers, so each new order exercises distance selection and a reservation.
            db.AddRange(Enumerable.Range(0, concurrency * 5 + 10).Select(i => MakeDriver($"load-{concurrency}-{i}", 44.03m)));
            await db.SaveChangesAsync();
        }
        var latencies = new System.Collections.Concurrent.ConcurrentBag<double>();
        var failures = new System.Collections.Concurrent.ConcurrentBag<string>();
        var assignedCount = 0;
        var watch = Stopwatch.StartNew();
        await Task.WhenAll(Enumerable.Range(0, concurrency).Select(async worker =>
        {
            for (var i = 0; i < 5; i++)
            {
                var clock = Stopwatch.StartNew();
                using var request = Request(HttpMethod.Post, "/api/checkout/place-order", customer.User.Id, "Customer",
                    new { addressId = address.Id, paymentMethod = 0, idempotencyKey = Guid.NewGuid().ToString(),
                        items = new[] { new { productId = product.Id, quantity = 1 }, new { productId = farProduct.Id, quantity = 1 } } });
                try
                {
                    using var response = await http.SendAsync(request);
                    using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    if (!response.IsSuccessStatusCode) failures.Add($"HTTP {(int)response.StatusCode}");
                    else if (json.RootElement.GetProperty("data").GetProperty("status").GetInt32() == (int)OrderStatus.DriverAssigned)
                        Interlocked.Increment(ref assignedCount);
                }
                catch (Exception ex) { failures.Add(ex.GetType().Name); }
                latencies.Add(clock.Elapsed.TotalMilliseconds);
            }
        }));
        watch.Stop();
        var sorted = latencies.Order().ToArray();
        var result = new { concurrency, requests = sorted.Length, failures = failures.Count, assignedCount,
            requestsPerSecond = Math.Round(sorted.Length / watch.Elapsed.TotalSeconds, 2),
            p50Ms = Math.Round(sorted[(int)(sorted.Length * .50)], 1), p95Ms = Math.Round(sorted[(int)(sorted.Length * .95)], 1),
            p99Ms = Math.Round(sorted[(int)(sorted.Length * .99)], 1), maxMs = Math.Round(sorted[^1], 1),
            errors = failures.GroupBy(x => x).ToDictionary(x => x.Key, x => x.Count()) };
        results.Add(result); Console.WriteLine(JsonSerializer.Serialize(result));
        // Replenish only in the isolated database; ensure GPS fixes are still fresh next round.
        using var reset = app.Services.CreateScope();
        await reset.ServiceProvider.GetRequiredService<AppDbContext>().Drivers.Where(d => d.Phone.StartsWith("load-"))
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.LocationUpdatedAt, DateTime.UtcNow));
    }
    var output = "/workspace/docs/courier-capacity-after-performance.json";
    await File.WriteAllTextAsync(output, JsonSerializer.Serialize(new { measuredAt = DateTime.UtcNow,
        environment = "4 vCPU / 4 GiB; local isolated PostgreSQL; 25 pooled connections; real two-store checkout + GPS dispatch; test auth; no external push", results },
        new JsonSerializerOptions { WriteIndented = true }));
    Console.WriteLine("Benchmark saved: " + output);
}
await app.StopAsync();
Console.WriteLine("All dispatch checks passed.");

sealed class TestAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder,
    AppDbContext db) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Guid.TryParse(Request.Headers["X-Test-User"], out var id) || !await db.Users.AnyAsync(u => u.Id == id && u.IsActive))
            return AuthenticateResult.NoResult();
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([
            new Claim("userId", id.ToString()), new Claim(ClaimTypes.Role, Request.Headers["X-Test-Role"].ToString())], "Test")), "Test"));
    }
}

sealed class FakeExpoHandler : HttpMessageHandler
{
    public int Calls;
    public bool Fail;
    public TaskCompletionSource? Gate;
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        Interlocked.Increment(ref Calls);
        if (Gate != null) await Gate.Task.WaitAsync(ct);
        return new HttpResponseMessage(Fail ? HttpStatusCode.ServiceUnavailable : HttpStatusCode.OK) {
            Content = JsonContent.Create(new { data = new[] { new { status = "ok" } } })
        };
    }
}
