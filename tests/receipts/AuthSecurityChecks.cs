using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BSStore.API.Controllers;
using BSStore.API.Middleware;
using BSStore.API.Services;
using BSStore.Application.Auth.DTOs;
using BSStore.Application.Auth.Interfaces;
using BSStore.Domain.Entities;
using BSStore.Domain.Enums;
using BSStore.Infrastructure.Data;
using BSStore.Infrastructure.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

static class AuthSecurityChecks
{
    static void Check(bool ok, string message) { if (!ok) throw new Exception(message); }

    public static async Task RunAsync()
    {
        var clock = new TestClock();
        using (var limiter = new LoginRateLimiter(clock))
        {
            // A fifth request at the end of the first window extends the block
            // for a full minute. Blocked retries do not keep extending it.
            for (var i = 0; i < 4; i++) Check(limiter.AttemptAcquire().IsAcquired, "First four attempts allowed");
            clock.Advance(59);
            Check(limiter.AttemptAcquire().IsAcquired, "Fifth attempt allowed");
            Check(!limiter.AttemptAcquire().IsAcquired, "Sixth attempt blocked");
            clock.Advance(59);
            Check(!limiter.AttemptAcquire().IsAcquired, "Cooldown must last 60 seconds after fifth attempt");
            clock.Advance(1);
            Check(limiter.AttemptAcquire().IsAcquired, "Cooldown expiry must restore login");
        }
        using (var limiter = new LoginRateLimiter(clock))
        {
            var results = await Task.WhenAll(Enumerable.Range(0, 40).Select(_ => Task.Run(() => limiter.AttemptAcquire().IsAcquired)));
            Check(results.Count(allowed => allowed) == 5, "Parallel requests must not bypass five-attempt limit");
        }

        var forwarded = new ForwardedHeadersOptions();
        AuthenticationProtection.ConfigureForwardedHeaders(forwarded);
        var untrusted = new DefaultHttpContext();
        untrusted.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.100");
        untrusted.Request.Headers["X-Forwarded-For"] = "198.51.100.99";
        var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(forwarded));
        await middleware.Invoke(untrusted);
        Check(untrusted.Connection.RemoteIpAddress.ToString() == "203.0.113.100", "Untrusted clients must not spoof limiter IP");

        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        var dbName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(dbName));
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddSingleton<IJwtTokenService, TestJwt>();
        builder.Services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly);
        builder.Services.Configure<ForwardedHeadersOptions>(AuthenticationProtection.ConfigureForwardedHeaders);
        builder.Services.AddRateLimiter(options =>
        {
            AuthenticationProtection.ConfigureLoginRateLimiting(options, clock);
            options.AddPolicy("phone-lookup", context => System.Threading.RateLimiting.RateLimitPartition.GetNoLimiter("lookup"));
        });
        await using var app = builder.Build();
        app.UseForwardedHeaders();
        app.UseMiddleware<ExceptionHandlingMiddleware>();
        app.UseRouting();
        app.UseRateLimiter();
        app.MapControllers();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = new User { Phone = "770000001", PasswordHash = BCrypt.Net.BCrypt.HashPassword(" CorrectPass123 ", 10), Role = UserRole.Customer };
            db.Users.Add(user);
            db.Customers.Add(new Customer { User = user, FullName = "عميل اختبار" });
            await db.SaveChangesAsync();
        }
        await app.StartAsync();
        try
        {
            using var http = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
            async Task<HttpResponseMessage> Login(string phone, string password, string ip = "198.51.100.1")
            {
                var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login") { Content = JsonContent.Create(new LoginRequest(phone, password, "Customer")) };
                // Only the rightmost hop from the trusted tunnel is accepted.
                req.Headers.Add("X-Forwarded-For", "198.51.100.254, " + ip);
                return await http.SendAsync(req);
            }
            var wrong = await Login("770000001", "wrong");
            var missing = await Login("770999999", "wrong");
            Check(wrong.StatusCode == HttpStatusCode.BadRequest && missing.StatusCode == wrong.StatusCode &&
                await wrong.Content.ReadAsStringAsync() == await missing.Content.ReadAsStringAsync(), "Wrong password and missing account must return identical errors");
            var ok = await Login(" 770000001 ", " CorrectPass123 ");
            Check(ok.StatusCode == HttpStatusCode.OK, "Correct credentials and phone trimming must succeed without trimming password");
            await Login("770999998", "wrong");
            await Login("770999997", "wrong");
            var blocked = await Login("770000001", " CorrectPass123 ");
            Check(blocked.StatusCode == HttpStatusCode.TooManyRequests && blocked.Headers.RetryAfter?.Delta == TimeSpan.FromSeconds(60), "Sixth request must receive 429 and Retry-After=60");
            var body = JsonDocument.Parse(await blocked.Content.ReadAsStringAsync());
            Check(body.RootElement.GetProperty("code").GetString() == "RATE_LIMITED", "Lockout must return a readable JSON response");
            Check((await Login("770000001", " CorrectPass123 ", "198.51.100.2")).StatusCode == HttpStatusCode.OK, "Other client IPs must not be locked out");
            clock.Advance(59);
            Check((await Login("770000001", " CorrectPass123 ")).StatusCode == HttpStatusCode.TooManyRequests, "No early cooldown release");
            clock.Advance(1);
            Check((await Login("770000001", " CorrectPass123 ")).StatusCode == HttpStatusCode.OK, "Login recovers after one minute");
            var present = await http.PostAsJsonAsync("/api/auth/check-phone", new { phone = "770000001" });
            var absent = await http.PostAsJsonAsync("/api/auth/check-phone", new { phone = "770999999" });
            Check(present.IsSuccessStatusCode && absent.IsSuccessStatusCode && await present.Content.ReadAsStringAsync() == await absent.Content.ReadAsStringAsync(), "Legacy lookup must never disclose account existence");
        }
        finally { await app.StopAsync(); }
        Console.WriteLine("PASS login security: identical credential errors, legacy lookup privacy, real HTTP limit/cooldown/recovery, isolated IPs, trusted proxy and concurrent attempts");
    }

    sealed class TestClock : TimeProvider
    {
        private DateTimeOffset _now = new(2026, 10, 11, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => _now;
        public void Advance(int seconds) => _now = _now.AddSeconds(seconds);
    }
    sealed class TestJwt : IJwtTokenService
    {
        public string GenerateAccessToken(Guid id, string phone, string role) => "test-access";
        public (string token, string hash, DateTime expiry) GenerateRefreshToken() => ("test-refresh", Guid.NewGuid().ToString(), DateTime.UtcNow.AddDays(1));
        public Guid? GetUserIdFromToken(string token) => null;
    }
}
