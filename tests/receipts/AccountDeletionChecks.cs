using BSStore.API.Controllers;
using BSStore.API.Services;
using BSStore.Application.Auth.Interfaces;
using BSStore.Application.Common.Interfaces;
using BSStore.Domain.Entities;
using BSStore.Domain.Enums;
using BSStore.Domain.Exceptions;
using BSStore.Infrastructure.Data;
using BSStore.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

static class AccountDeletionChecks
{
    static void Check(bool ok, string message) { if (!ok) throw new Exception(message); }
    public static async Task RunAsync()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var user = new User { Phone = "770000001", FullName = "اسم خاص", Email = "private@example.test", PasswordHash = BCrypt.Net.BCrypt.HashPassword("DeletePass123"), FcmToken = "private-token", Role = UserRole.Customer };
        var customer = new Customer { User = user, FullName = "اسم خاص" };
        var address = new Address { Customer = customer, City = "مدينة خاصة", Street = "شارع خاص", Latitude = 15, Longitude = 44, IsDefault = true };
        var order = new Order { Customer = customer, Address = address, Status = OrderStatus.OutForDelivery, Notes = "ملاحظات خاصة", CustomerReview = "تعليق خاص", TotalAmount = 5000 };
        var payment = new Payment { Order = order, Amount = 5000, TransferReference = "private-reference", RejectionReason = "private-reason" };
        var key = $"r2:private/receipts/{Guid.NewGuid():N}.jpg";
        var receipt = new PaymentReceipt { Payment = payment, StorageKey = key };
        var cart = new Cart { Customer = customer };
        var refresh = new RefreshToken { User = user, TokenHash = "private-session", ExpiresAt = DateTime.UtcNow.AddDays(1) };
        var other = new User { Phone = "770000002", Role = UserRole.Customer, PasswordHash = BCrypt.Net.BCrypt.HashPassword("OtherPass123") };
        db.AddRange(user, customer, address, order, payment, receipt, cart, refresh, other);
        db.PushDeliveryJobs.Add(new PushDeliveryJob { UserIdsJson = System.Text.Json.JsonSerializer.Serialize(new[] { user.Id }),
            Title = "Private", Body = "Private customer payload", Type = "account-deletion-test" });
        db.PushDevices.Add(new PushDevice { User = user, ExpoPushToken = "private-push", Platform = "android", AppType = "customer" });
        db.Notifications.Add(new Notification { User = user, Body = "private-notification" });
        db.AuditLogs.Add(new AuditLog { ActorId = user.Id, OldValuesJson = "private-pii" });
        db.FlaggedUsers.Add(new FlaggedUser { Phone = user.Phone, Name = customer.FullName });
        await db.SaveChangesAsync();
        var storage = new TestStorage(key);
        var cleanup = new AccountFileCleanup(db, storage, NullLogger<AccountFileCleanup>.Instance);
        var deletion = new AccountDeletionService(db, cleanup);
        async Task Reject(Guid? id, string? phone, string password, string code)
        {
            try { await deletion.DeleteAsync(id, phone, password, default); throw new Exception("Unsafe deletion accepted"); }
            catch (BusinessRuleException e) { Check(e.Code == code, "Unexpected deletion failure: " + e.Code); }
            Check((await db.Users.FindAsync(user.Id))!.IsActive && await db.PaymentReceipts.AnyAsync(), "Failure must not erase any data");
        }
        await Reject(user.Id, null, "wrong", "INVALID_CREDENTIALS");
        await Reject(other.Id, null, "DeletePass123", "INVALID_CREDENTIALS");
        await Reject(user.Id, null, "DeletePass123", "ACTIVE_ORDERS");
        var pending = await db.Orders.FindAsync(order.Id); pending!.Status = OrderStatus.Delivered; await db.SaveChangesAsync();
        // The web controller calls the same erasure implementation without creating a session.
        var controller = new AccountController(deletion);
        await controller.DeleteFromWeb(new("770000001", "DeletePass123"), default);
        db.ChangeTracker.Clear();
        var erased = (await db.Users.FindAsync(user.Id))!;
        var erasedCustomer = (await db.Customers.FindAsync(customer.Id))!;
        var erasedAddress = (await db.Addresses.FindAsync(address.Id))!;
        var keptOrder = (await db.Orders.FindAsync(order.Id))!;
        var keptPayment = (await db.Payments.FindAsync(payment.Id))!;
        Check(!erased.IsActive && erased.Phone != "770000001" && erased.FullName == null && erased.Email == null && erased.FcmToken == null && !BCrypt.Net.BCrypt.Verify("DeletePass123", erased.PasswordHash), "Identity, password and device token must be erased");
        Check(erasedCustomer.FullName == "حساب محذوف" && erasedCustomer.GovernorateId == null && erasedCustomer.ProfileImageKey == null, "Customer profile must be cleared");
        Check(erasedAddress.IsDeleted && erasedAddress.City == "" && erasedAddress.Street == "" && erasedAddress.Latitude == 0 && erasedAddress.Longitude == 0, "Historical address must be scrubbed");
        Check(keptOrder.TotalAmount == 5000 && keptOrder.Notes == null && keptOrder.CustomerReview == null && keptPayment.Amount == 5000 && keptPayment.TransferReference == null && keptPayment.RejectionReason == null, "Keep accounting amounts without customer notes/transfer data");
        Check(!await db.RefreshTokens.AnyAsync() && !await db.Carts.AnyAsync() && !await db.PushDevices.AnyAsync() && !await db.Notifications.AnyAsync() && !await db.PushDeliveryJobs.AnyAsync() && !await db.PaymentReceipts.AnyAsync() && !await db.FlaggedUsers.AnyAsync() && !await db.AuditLogs.AnyAsync(), "Sessions, cart, push, notifications, receipts and copies of PII must be erased");
        Check((await db.Users.FindAsync(other.Id))!.IsActive, "Another customer's account must remain available");
        var auth = new AuthService(db, new NoJwt());
        Check(!await auth.PhoneExistsAsync("770000001"), "Original phone must be available for a new account");
        try { await auth.LoginAsync(new("770000001", "DeletePass123", "Customer")); throw new Exception("Deleted account logged in"); } catch (BusinessRuleException) { }
        storage.Fail = true; await cleanup.ProcessAsync(default);
        Check(await db.AppSettings.AnyAsync(s => s.Key.StartsWith(AccountFileCleanup.Prefix)) && storage.Exists, "Storage failure must retain a durable cleanup job");
        storage.Fail = false; await cleanup.ProcessAsync(default);
        Check(!await db.AppSettings.AnyAsync(s => s.Key.StartsWith(AccountFileCleanup.Prefix)) && !storage.Exists, "Retry must erase receipt files");
        // Mobile path: scoped to the authenticated customer, not a user ID supplied in the body.
        controller.ControllerContext = new() { HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext { User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity([new("userId", other.Id.ToString())], "test")) } };
        await controller.Delete(new("OtherPass123"), default);
        Check(!(await db.Users.FindAsync(other.Id))!.IsActive, "Mobile deletion must erase the current account");
        var suspended = new User { Phone = "770000004", IsActive = false, Role = UserRole.Customer, PasswordHash = BCrypt.Net.BCrypt.HashPassword("SuspendedPass123") };
        db.Users.Add(suspended);
        db.RefreshTokens.Add(new RefreshToken { User = suspended, TokenHash = BSStore.Infrastructure.Identity.JwtTokenService.ComputeHash("inactive-refresh"), ExpiresAt = DateTime.UtcNow.AddDays(1) });
        await db.SaveChangesAsync();
        try { await auth.RefreshTokenAsync(new("inactive-refresh")); throw new Exception("Inactive session refreshed"); } catch (BusinessRuleException e) { Check(e.Code == "INVALID_REFRESH_TOKEN", "Inactive session must be denied"); }
        await controller.DeleteFromWeb(new("770000004", "SuspendedPass123"), default);
        Check((await db.Users.FindAsync(suspended.Id))!.Phone != "770000004", "Suspended customers must still be able to erase their account on the website");
        var admin = new User { Phone = "770000003", Role = UserRole.Admin, PasswordHash = BCrypt.Net.BCrypt.HashPassword("AdminPass123") };
        db.Users.Add(admin); await db.SaveChangesAsync();
        try { await deletion.DeleteAsync(null, admin.Phone, "AdminPass123", default); throw new Exception("Admin erased via customer pathway"); } catch (BusinessRuleException e) { Check(e.Code == "INVALID_CREDENTIALS", "Admin must be rejected"); }
        Console.WriteLine("PASS account deletion: web/mobile, password/ownership/role, active-order guard, PII erasure, session revocation, phone reuse, accounting preservation and durable file retry");
    }
    sealed class NoJwt : IJwtTokenService
    {
        public string GenerateAccessToken(Guid id, string phone, string role) => "test";
        public (string token, string hash, DateTime expiry) GenerateRefreshToken() => ("test", "test", DateTime.UtcNow.AddDays(1));
        public Guid? GetUserIdFromToken(string token) => null;
    }
    sealed class TestStorage(string key) : IStorageService
    {
        public bool Fail; public bool Exists = true;
        public Task<bool> DeleteFileAsync(string fileKey, CancellationToken ct = default) { Check(fileKey == key, "Only the owned file may be erased"); if (Fail) throw new IOException("Offline"); Exists = false; return Task.FromResult(true); }
        public Task<string> UploadFileAsync(Stream stream, string name, string contentType, string folder = "general", CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Stream?> OpenFileReadAsync(string key, CancellationToken ct = default) => Task.FromResult<Stream?>(null);
        public Task<string?> GetDirectReadUrlAsync(string key, TimeSpan life, CancellationToken ct = default) => Task.FromResult<string?>(null);
        public string GetFileUrl(string key) => key;
    }
}
