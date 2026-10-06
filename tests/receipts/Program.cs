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

// This host runs the actual receipt/review controllers with isolated metadata
// and temporary file storage. It never loads the production database or secrets.
var root = Path.Combine(Path.GetTempPath(), $"bsstore-receipt-test-{Guid.NewGuid():N}");
var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:LocalPath"] = root });
// Every request must share the same isolated in-memory database.
var databaseName = Guid.NewGuid().ToString();
builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName));
builder.Services.AddScoped<IStorageService, LocalStorageService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<PushNotificationService>();
builder.Services.AddControllers().AddApplicationPart(typeof(PaymentsController).Assembly);
builder.Services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthentication>("Test", _ => { });
builder.Services.AddAuthorization();
var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

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
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { url = app.Urls.Single(), orderId, paymentId }));
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
