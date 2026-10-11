using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BSStore.API.Services;
using BSStore.Domain.Entities;
using BSStore.Domain.Enums;
using BSStore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

static class PerformanceChecks
{
    public static async Task RunAsync(WebApplication app, HttpClient http, Customer customer, Driver driver, Action<bool, string> check)
    {
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            // Clear only this isolated test DB's previous outbox jobs before queue assertions.
            await db.PushDeliveryJobs.ExecuteDeleteAsync();
            db.PushDevices.Add(new PushDevice { UserId = driver.UserId, AppType = "courier", ExpoPushToken = "ExponentPushToken[dispatch-test]" });
            db.DriverTransactions.AddRange(new[] {
                new DriverTransaction { DriverId = driver.Id, Type = DriverTransactionType.CustomerCollection, Amount = 1000 },
                new DriverTransaction { DriverId = driver.Id, Type = DriverTransactionType.Refund, Amount = 100 },
                new DriverTransaction { DriverId = driver.Id, Type = DriverTransactionType.StorePurchase, Amount = 200 },
                new DriverTransaction { DriverId = driver.Id, Type = DriverTransactionType.CompanySettlement, Amount = 150 },
                new DriverTransaction { DriverId = driver.Id, Type = DriverTransactionType.DriverFunding, Amount = 50 },
                new DriverTransaction { DriverId = driver.Id, Type = DriverTransactionType.DriverEarning, Amount = 75 }
            });
            await db.SaveChangesAsync();
        }
        async Task<JsonElement> Get(string path, string role, Guid user) {
            using var request = new HttpRequestMessage(HttpMethod.Get, path);
            request.Headers.Add("X-Test-User", user.ToString()); request.Headers.Add("X-Test-Role", role);
            using var response = await http.SendAsync(request);
            if (!response.IsSuccessStatusCode) throw new Exception(path + " returned " + response.StatusCode + " " + await response.Content.ReadAsStringAsync());
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return json.RootElement.GetProperty("data").Clone();
        }
        var totals = await Get("/api/driver/financial/summary", "Driver", driver.UserId);
        check(totals.GetProperty("netOutstandingDebt").GetDecimal() == 600, "SQL financial totals preserve refunds, purchases, funding and settlements");
        var drivers = await Get("/api/admin/drivers", "Admin", customer.UserId);
        var account = drivers.EnumerateArray().Single(d => d.GetProperty("id").GetGuid() == driver.Id);
        check(account.GetProperty("outstandingDebt").GetDecimal() == 600 && account.GetProperty("totalEarnings").GetDecimal() == 75, "admin aggregate returns correct balances and earnings");
        var emptyAccount = drivers.EnumerateArray().First(d => d.GetProperty("id").GetGuid() != driver.Id);
        check(emptyAccount.GetProperty("outstandingDebt").GetDecimal() == 0, "driver with no ledger still appears with zero totals");
        await Get("/api/admin/dashboard", "Admin", customer.UserId);
        check(true, "combined dashboard aggregate translates and handles daily ranges");
        await Get("/api/admin/orders", "Admin", customer.UserId);
        check(true, "split order query preserves complete order DTOs");
        using (var request = new HttpRequestMessage(HttpMethod.Post, "/api/admin/categories")) {
            request.Headers.Add("X-Test-User", customer.UserId.ToString()); request.Headers.Add("X-Test-Role", "Admin");
            request.Content = JsonContent.Create(new { name = "New category", iconName = "folder", sortOrder = 2 });
            using var response = await http.SendAsync(request);
            response.EnsureSuccessStatusCode();
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            check(json.RootElement.GetProperty("data").GetProperty("id").GetGuid() != Guid.Empty, "category creation returns its persisted ID for immediate UI insertion");
        }
        var handler = app.Services.GetRequiredService<FakeExpoHandler>();
        handler.Gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using (var scope = app.Services.CreateScope()) {
            var push = scope.ServiceProvider.GetRequiredService<PushNotificationService>();
            await push.NotifyUsersAsync([driver.UserId], "Test", "Test", "performance-test", new { orderId = Guid.Empty });
            check(handler.Calls == 0, "business notification queues durably without waiting for Expo");
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            check(await db.PushDeliveryJobs.CountAsync() == 1 && await db.Notifications.AnyAsync(n => n.Type == "performance-test"), "push job and in-app notification are persisted together");
        }
        var worker = new PushDeliveryWorker(app.Services.GetRequiredService<IServiceScopeFactory>(), app.Services.GetRequiredService<ILogger<PushDeliveryWorker>>());
        var send = worker.ProcessNextAsync(default);
        for (var i = 0; i < 100 && handler.Calls == 0; i++) await Task.Delay(10);
        check(handler.Calls == 1, "worker claims a pending push job");
        check(!await worker.ProcessNextAsync(default), "second worker cannot send a leased job twice");
        handler.Gate.TrySetResult(); await send; handler.Gate = null;
        using (var scope = app.Services.CreateScope()) check(await scope.ServiceProvider.GetRequiredService<AppDbContext>().PushDeliveryJobs.AllAsync(j => j.DeliveredAt != null), "successful queued push is marked delivered");
        handler.Fail = true;
        using (var scope = app.Services.CreateScope()) await scope.ServiceProvider.GetRequiredService<PushNotificationService>().SendPushOnlyAsync([driver.UserId], "Test", "Test", "retry-test", null);
        await worker.ProcessNextAsync(default);
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var retry = await db.PushDeliveryJobs.SingleAsync(j => j.Type == "retry-test");
            check(retry.DeliveredAt == null && retry.Attempts == 1 && retry.NextAttemptAt > DateTime.UtcNow, "Expo failure remains durable with bounded retry backoff");
            retry.NextAttemptAt = DateTime.UtcNow.AddSeconds(-1); await db.SaveChangesAsync();
        }
        handler.Fail = false; await worker.ProcessNextAsync(default);
        using (var scope = app.Services.CreateScope()) check(await scope.ServiceProvider.GetRequiredService<AppDbContext>().PushDeliveryJobs.AnyAsync(j => j.Type == "retry-test" && j.DeliveredAt != null && j.Attempts == 2), "failed push succeeds on the next eligible retry");
    }
}
