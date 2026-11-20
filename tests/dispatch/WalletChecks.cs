using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using BSStore.API.Services;
using BSStore.Application.Common.Interfaces;
using BSStore.Domain.Entities;
using BSStore.Domain.Enums;
using BSStore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public static class WalletChecks
{
    public static async Task RunAsync(WebApplication app, HttpClient http, Action<bool, string> check)
    {
        var customer = new Customer { FullName = "Wallet customer", User = new User { FullName = "Wallet customer", Phone = "wallet-customer", PasswordHash = "test", Role = UserRole.Customer } };
        var other = new Customer { FullName = "Other wallet customer", User = new User { Phone = "wallet-other", PasswordHash = "test", Role = UserRole.Customer } };
        var driver = new Driver { FullName = "Wallet courier", Phone = "wallet-driver", User = new User { FullName = "Wallet courier", Phone = "wallet-driver", PasswordHash = "test", Role = UserRole.Driver } };
        var admin = new User { FullName = "Wallet admin", Phone = "wallet-admin", PasswordHash = "test", Role = UserRole.Admin };
        Address address; Guid productId; Guid methodId; string methodVersion = "";
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = await db.Products.Include(p => p.Store).FirstAsync(); productId = product.Id;
            customer.GovernorateId = product.Store.GovernorateId;
            address = new Address { Customer = customer, City = "Test", District = "Test", Street = "Test", Latitude = 15, Longitude = 44 };
            db.AddRange(address, other, driver, admin); await db.SaveChangesAsync();
            methodId = (await db.WalletMethods.FirstAsync(m => m.Code == "ALKURAIMI")).Id;
        }
        async Task<(HttpStatusCode Status, JsonElement Data)> Send(HttpMethod method, string path, Guid user, string role, object? body = null, HttpContent? content = null) {
            using var request = new HttpRequestMessage(method, path);
            request.Headers.Add("X-Test-User", user.ToString()); request.Headers.Add("X-Test-Role", role);
            request.Content = content ?? (body == null ? null : JsonContent.Create(body));
            using var response = await http.SendAsync(request);
            var text = await response.Content.ReadAsStringAsync();
            if (response.StatusCode == HttpStatusCode.InternalServerError) throw new Exception($"{path}: {text}");
            using var json = JsonDocument.Parse(string.IsNullOrWhiteSpace(text) ? "{}" : text);
            return (response.StatusCode, (json.RootElement.TryGetProperty("data", out var data) ? data : json.RootElement).Clone());
        }
        Task<(HttpStatusCode Status, JsonElement Data)> Admin(string path, object? body = null) => Send(HttpMethod.Post, path, admin.Id, "Admin", body ?? new { });
        async Task<decimal> Balance() => (await Send(HttpMethod.Get, "/api/wallet/balance", customer.UserId, "Customer")).Data.GetProperty("balance").GetDecimal();
        var methods = await Send(HttpMethod.Get, "/api/wallet/methods", customer.UserId, "Customer");
        check(methods.Data.GetArrayLength() == 0, "new transfer destinations remain hidden until configured");
        var saved = await Send(HttpMethod.Put, $"/api/admin/wallet/methods/{methodId}", admin.Id, "Admin", new { name = "كريمي", accountName = "Test company", accountNumber = "TEST-ACCOUNT", instructions = "Test only", isActive = true });
        methodVersion = saved.Data.GetProperty("updatedAt").GetString()!;
        check(saved.Status == HttpStatusCode.OK, "admin configures a complete transfer destination");
        check((await Send(HttpMethod.Put, $"/api/admin/wallet/methods/{methodId}", customer.UserId, "Customer", new { })).Status == HttpStatusCode.Forbidden, "customer cannot configure receiving accounts");
        async Task<(HttpStatusCode Status, JsonElement Data)> TopUp(string reference, decimal amount, string? key = null, bool validImage = true) {
            var form = new MultipartFormDataContent();
            foreach (var item in new Dictionary<string,string> { ["methodId"] = methodId.ToString(), ["methodUpdatedAt"] = methodVersion, ["amount"] = amount.ToString(System.Globalization.CultureInfo.InvariantCulture), ["senderName"] = "مرسل تجربة", ["senderPhone"] = "777000000", ["transferReference"] = reference, ["idempotencyKey"] = key ?? Guid.NewGuid().ToString() }) form.Add(new StringContent(item.Value), item.Key);
            using var image = new Image<Rgba32>(2, 2);
            using var imageStream = new MemoryStream(); await image.SaveAsPngAsync(imageStream);
            var bytes = imageStream.ToArray();
            if (!validImage) bytes[29] ^= 0xFF;
            var file = new ByteArrayContent(bytes); file.Headers.ContentType = new MediaTypeHeaderValue("image/png"); form.Add(file, "file", "receipt.png");
            return await Send(HttpMethod.Post, "/api/wallet/topups", customer.UserId, "Customer", content: form);
        }
        check((await TopUp("bad-image", 20, validImage: false)).Status == HttpStatusCode.BadRequest, "fake receipt contents are rejected");
        var pending = await TopUp("wallet-transfer-1", 5000, "same-topup-attempt");
        check(pending.Status == HttpStatusCode.OK && await Balance() == 0, "receipt submission stays pending without crediting the customer");
        var topUpId = pending.Data.GetProperty("id").GetGuid();
        var repeat = await TopUp("wallet-transfer-1", 5000, "same-topup-attempt");
        check(repeat.Data.GetProperty("id").GetGuid() == topUpId, "top-up retries return the same request");
        check((await TopUp("WALLET TRANSFER 1", 5000)).Status == HttpStatusCode.BadRequest, "normalized transfer reference cannot be reused");
        check((await TopUp("wallet-transfer-1", 99, "same-topup-attempt")).Status == HttpStatusCode.BadRequest, "idempotency key cannot be reused with a different amount");
        var deniedReceipt = await Send(HttpMethod.Get, $"/api/wallet/receipts/{topUpId}/download-link", other.UserId, "Customer");
        check(deniedReceipt.Status == HttpStatusCode.NotFound, "another customer cannot inspect private receipt links");
        var approvals = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => Admin($"/api/admin/wallet/topups/{topUpId}/approve")));
        check(approvals.All(x => x.Status == HttpStatusCode.OK) && await Balance() == 5000, "eight simultaneous approvals credit exactly once");
        var duplicateOrderTransfer = await Send(HttpMethod.Post, "/api/checkout/place-order", customer.UserId, "Customer", new {
            addressId = address.Id, paymentMethod = 1, transferProvider = "ALKURAIMI", transferReference = "wallet-transfer-1",
            items = new[] { new { productId, quantity = 1 } }, idempotencyKey = "duplicate-bank-reference"
        });
        check(duplicateOrderTransfer.Status == HttpStatusCode.BadRequest, "a credited wallet transfer cannot also pay an order");
        var rejected = (await TopUp("wallet-transfer-reject", 70)).Data.GetProperty("id").GetGuid();
        check((await Admin($"/api/admin/wallet/topups/{rejected}/reject", new { reason = " " })).Status == HttpStatusCode.BadRequest, "rejection requires a reason");
        check((await Admin($"/api/admin/wallet/topups/{rejected}/reject", new { reason = "الحوالة غير مستلمة" })).Status == HttpStatusCode.OK && await Balance() == 5000, "rejecting a request preserves the balance");
        var summary = await Send(HttpMethod.Get, "/api/wallet", customer.UserId, "Customer");
        check(summary.Status == HttpStatusCode.OK && summary.Data.GetProperty("topUps").EnumerateArray().Any(t => t.GetProperty("rejectionReason").GetString() == "الحوالة غير مستلمة"), "customer wallet exposes approval state and rejection reason");
        var requests = await Send(HttpMethod.Get, "/api/admin/wallet/topups?status=Approved&query=Wallet", admin.Id, "Admin");
        check(requests.Status == HttpStatusCode.OK && requests.Data.GetArrayLength() == 1, "admin request filters translate on PostgreSQL");

        object Checkout(string key) => new { addressId = address.Id, paymentMethod = 0, useWallet = true, idempotencyKey = key, items = new[] { new { productId, quantity = 30 } } };
        var orders = await Task.WhenAll(new[] { "wallet-order-a", "wallet-order-b" }.Select(key => Send(HttpMethod.Post, "/api/checkout/place-order", customer.UserId, "Customer", Checkout(key))));
        check(orders.All(x => x.Status == HttpStatusCode.OK), "two simultaneous wallet checkouts complete with cash fallback");
        check(orders.Sum(x => x.Data.GetProperty("walletPaidAmount").GetDecimal()) == 5000 && await Balance() == 0, "simultaneous checkouts cannot overspend a wallet");
        var originalOrder = orders[0].Data; var orderId = originalOrder.GetProperty("id").GetGuid();
        var retry = await Send(HttpMethod.Post, "/api/checkout/place-order", customer.UserId, "Customer", Checkout("wallet-order-a"));
        check(retry.Data.GetProperty("id").GetGuid() == orderId && await Balance() == 0, "checkout retry does not debit twice");
        await Admin($"/api/admin/orders/{orderId}/reject", new { reason = "test rejection" });
        check(await Balance() == originalOrder.GetProperty("walletPaidAmount").GetDecimal(), "admin order rejection refunds the exact wallet portion");
        var secondId = orders[1].Data.GetProperty("id").GetGuid();
        var cancellation = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => Send(HttpMethod.Post, $"/api/orders/{secondId}/cancel", customer.UserId, "Customer", new { reasonCode = "CUSTOMER_REQUEST", description = "test" })));
        check(cancellation.Any(x => x.Status == HttpStatusCode.OK) && await Balance() == 5000, "concurrent cancellation refunds each debit only once");

        async Task<Guid> Delivery(decimal total = 1800, decimal paid = 0, bool seedPayment = false) {
            using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var order = new Order { Id = Guid.NewGuid(), CustomerId = customer.Id, AddressId = address.Id, DriverId = driver.Id, OrderNumber = Guid.NewGuid().ToString("N")[..20],
                Status = OrderStatus.OutForDelivery, PaymentMethod = PaymentMethod.CashOnDelivery, SubTotal = total, TotalAmount = total, WalletPaidAmount = paid,
                Payment = new Payment { Amount = total, Method = PaymentMethod.CashOnDelivery } };
            if (seedPayment) await WalletService.AtomicAsync(db, async () => {
                db.Orders.Add(order); var wallet = new WalletService(db); var c = await wallet.CustomerAsync(customer.Id, default);
                wallet.Add(c, -paid, "OrderPayment", $"order:{order.Id}:debit", customer.UserId, "test order", order.Id);
                return new Microsoft.AspNetCore.Mvc.OkResult();
            }, default);
            else { db.Orders.Add(order); await db.SaveChangesAsync(); }
            return order.Id;
        }
        var delivery = await Delivery();
        var deliveries = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => Send(HttpMethod.Put, $"/api/driver/orders/{delivery}/delivered", driver.UserId, "Driver", new { cashAdjustmentSettled = false, cashReceived = 2000, creditChangeToWallet = true })));
        check(deliveries.All(x => x.Status == HttpStatusCode.OK) && await Balance() == 5200, "1800/2000 delivery credits 200 once under concurrent retries");
        var totals = await Send(HttpMethod.Get, "/api/driver/financial/summary", driver.UserId, "Driver");
        check(totals.Data.GetProperty("netOutstandingDebt").GetDecimal() == 2000 && totals.Data.GetProperty("walletChangeCreditedToday").GetDecimal() == 200, "driver custody includes the full collected 2000 without double counting change");
        var tooLarge = await Delivery();
        check((await Send(HttpMethod.Put, $"/api/driver/orders/{tooLarge}/delivered", driver.UserId, "Driver", new { cashReceived = 3000, creditChangeToWallet = true })).Status == HttpStatusCode.BadRequest, "change above 1000 is rejected atomically");
        check((await Send(HttpMethod.Put, $"/api/driver/orders/{tooLarge}/delivered", other.UserId, "Customer", new { cashReceived = 2000, creditChangeToWallet = true })).Status == HttpStatusCode.Forbidden, "customer cannot credit courier change");
        var raceOrders = new List<Guid>(); for (var i = 0; i < 7; i++) raceOrders.Add(await Delivery());
        var capRace = await Task.WhenAll(raceOrders.Select(id => Send(HttpMethod.Put, $"/api/driver/orders/{id}/delivered", driver.UserId, "Driver", new { cashReceived = 2800, creditChangeToWallet = true })));
        check(capRace.Count(x => x.Status == HttpStatusCode.OK) == 4, "driver-wide row lock enforces daily limit across concurrent orders");
        var report = await Send(HttpMethod.Get, "/api/admin/wallet/report", admin.Id, "Admin");
        check(report.Status == HttpStatusCode.OK && report.Data.GetProperty("mismatches").GetInt32() == 0, "admin reconciliation report matches every balance to its ledger");
        var changeId = report.Data.GetProperty("transactions").EnumerateArray().First(t => t.GetProperty("type").GetString() == "CourierChange").GetProperty("id").GetGuid();
        check((await Admin($"/api/admin/wallet/transactions/{changeId}/reverse", new { reason = "cash corrected", cashReconciled = false })).Status == HttpStatusCode.BadRequest, "reversal requires explicit cash reconciliation");
        var reversals = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => Admin($"/api/admin/wallet/transactions/{changeId}/reverse", new { reason = "cash corrected", cashReconciled = true })));
        check(reversals.Count(x => x.Status == HttpStatusCode.OK) == 1, "concurrent reversal appends a single correction");
        report = await Send(HttpMethod.Get, "/api/admin/wallet/report?query=Wallet", admin.Id, "Admin");
        check(report.Data.GetProperty("mismatches").GetInt32() == 0, "reversal keeps ledger, customer balance and report consistent");
        var remaining = await Delivery();
        check((await Send(HttpMethod.Put, $"/api/driver/orders/{remaining}/delivered", driver.UserId, "Driver", new { cashReceived = 2800, creditChangeToWallet = true })).Status == HttpStatusCode.BadRequest, "reversal does not recycle the courier daily allowance");
        var beforeSettlement = (await Send(HttpMethod.Get, "/api/driver/financial/summary", driver.UserId, "Driver")).Data.GetProperty("netOutstandingDebt").GetDecimal();
        var settlementRequests = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => Send(HttpMethod.Post, "/api/driver/financial/settlements", driver.UserId, "Driver", new { amount = 500, note = "test custody return" })));
        check(settlementRequests.Count(r => r.Status == HttpStatusCode.OK) == 1, "concurrent courier settlement requests create one pending request");
        Guid settlementId;
        using (var scope = app.Services.CreateScope()) settlementId = await scope.ServiceProvider.GetRequiredService<AppDbContext>().DriverSettlements.Where(s => s.DriverId == driver.Id && s.Status == "Pending").Select(s => s.Id).SingleAsync();
        var settlementApprovals = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => Admin($"/api/admin/driver-settlements/{settlementId}/approve")));
        var afterSettlement = (await Send(HttpMethod.Get, "/api/driver/financial/summary", driver.UserId, "Driver")).Data.GetProperty("netOutstandingDebt").GetDecimal();
        check(settlementApprovals.Count(r => r.Status == HttpStatusCode.OK) == 1 && beforeSettlement - afterSettlement == 500, "concurrent settlement approvals reduce custody by 500 exactly once");
        // Reconciliation is atomic with a price decrease at delivery, never an extra debit.
        var lower = await Delivery(100, 200, true);
        var before = await Balance();
        check((await Send(HttpMethod.Put, $"/api/driver/orders/{lower}/delivered", driver.UserId, "Driver", new { cashReceived = 0 })).Status == HttpStatusCode.OK && await Balance() == before + 100, "lower final price refunds excess wallet payment at delivery");
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await WalletService.AtomicAsync(db, async () => {
                var wallet = new WalletService(db); var c = await wallet.CustomerAsync(customer.Id, default);
                wallet.Add(c, -c.WalletBalance, "OrderPayment", "test:spend-all", customer.UserId, "test wallet spending");
                return new Microsoft.AspNetCore.Mvc.OkResult();
            }, default);
        }
        report = await Send(HttpMethod.Get, "/api/admin/wallet/report", admin.Id, "Admin");
        var spentChange = report.Data.GetProperty("transactions").EnumerateArray().First(t => t.GetProperty("type").GetString() == "CourierChange" && !t.GetProperty("isReversed").GetBoolean()).GetProperty("id").GetGuid();
        check((await Admin($"/api/admin/wallet/transactions/{spentChange}/reverse", new { reason = "test unavailable balance", cashReconciled = true })).Status == HttpStatusCode.BadRequest && await Balance() == 0,
            "spent credit cannot be reversed into a negative balance or forgiven driver debt");
        check(WalletService.YemenDayStart(DateTime.Parse("2026-11-20T20:59:59Z").ToUniversalTime()) != WalletService.YemenDayStart(DateTime.Parse("2026-11-20T21:00:00Z").ToUniversalTime()), "courier daily allowance rolls over at Yemen midnight");
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var mutationBlocked = false;
            try { await db.Database.ExecuteSqlRawAsync("UPDATE \"WalletTransactions\" SET \"Description\" = 'tamper'"); } catch (Npgsql.PostgresException) { mutationBlocked = true; }
            check(mutationBlocked, "database trigger blocks direct ledger tampering");
            check(await db.Notifications.AnyAsync(n => n.UserId == customer.UserId && n.Type == "wallet_topup_rejected") && await db.PushDeliveryJobs.AnyAsync(j => j.Type == "wallet_transaction"), "wallet notifications and durable pushes are persisted");
        }
        Console.WriteLine("WALLET CHECKS COMPLETE");
    }
}

public sealed class WalletTestStorage : IStorageService
{
    private readonly ConcurrentDictionary<string, byte[]> files = new();
    public async Task<string> UploadFileAsync(Stream stream, string fileName, string contentType, string folder = "general", CancellationToken ct = default) {
        using var data = new MemoryStream(); await stream.CopyToAsync(data, ct); var key = folder + "/" + Guid.NewGuid(); files[key] = data.ToArray(); return key;
    }
    public Task<bool> DeleteFileAsync(string fileKey, CancellationToken ct = default) => Task.FromResult(files.TryRemove(fileKey, out _));
    public Task<Stream?> OpenFileReadAsync(string fileKey, CancellationToken ct = default) => Task.FromResult<Stream?>(files.TryGetValue(fileKey, out var bytes) ? new MemoryStream(bytes) : null);
    public Task<string?> GetDirectReadUrlAsync(string fileKey, TimeSpan lifetime, CancellationToken ct = default) => Task.FromResult<string?>(null);
    public string GetFileUrl(string fileKey) => fileKey;
}
