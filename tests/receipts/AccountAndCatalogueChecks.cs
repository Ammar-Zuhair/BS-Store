using System.Security.Claims;
using System.Text.Json;
using BSStore.API.Controllers;
using BSStore.API.Services;
using BSStore.Application.Auth.Interfaces;
using BSStore.Application.Common;
using BSStore.Domain.Entities;
using BSStore.Domain.Enums;
using BSStore.Infrastructure.Data;
using BSStore.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

static class AccountAndCatalogueChecks
{
    static void Check(bool ok, string message) { if (!ok) throw new Exception(message); }
    public static async Task RunAsync()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var user = new User { Phone = "00000000", PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldPass123"), Role = UserRole.Customer };
        var customer = new Customer { User = user, FullName = "اسم العميل" };
        var address = new Address { Customer = customer, City = "المدينة القديمة", Street = "الشارع", Latitude = 15, Longitude = 44, IsDefault = true };
        db.AddRange(user, customer, address);
        var order = new Order { Customer = customer, Address = address };
        db.Orders.Add(order);
        db.RefreshTokens.Add(new RefreshToken { User = user, TokenHash = "old-session", ExpiresAt = DateTime.UtcNow.AddDays(2) });
        await db.SaveChangesAsync();
        var controller = new CustomersController(db) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("userId", user.Id.ToString())], "test")) } } };
        var edit = await controller.UpdateAddress(address.Id, new CreateAddressRequest(AddressLabel.Work, "مدينة جديدة", "حي", "شارع", null, null, 16, 45, true), default) as OkObjectResult;
        var newId = ((ApiResponse<AddressDto>)edit!.Value!).Data!.Id;
        Check(newId != address.Id && address.IsDeleted && order.AddressId == address.Id && address.City == "المدينة القديمة", "Editing must preserve the destination of existing orders");
        Check(await controller.UpdateAddress(Guid.NewGuid(), new CreateAddressRequest(AddressLabel.Home, "x", "", "x", null, null, 15, 44, false), default) is NotFoundObjectResult, "Address updates must check ownership");
        await controller.DeleteAddress(newId, default);
        Check((await db.Addresses.FindAsync(newId))!.IsDeleted && order.AddressId == address.Id, "Delete must hide rather than remove addresses used by orders");
        Check(await controller.SetDefaultAddress(Guid.NewGuid(), default) is NotFoundObjectResult, "Unknown default address must be rejected");
        var auth = new AuthService(db, new TestJwt());
        Check((await auth.GetUserAsync(user.Id)).FullName == customer.FullName, "Me must return the real customer name");
        try { await auth.ChangePasswordAsync(user.Id, "wrong", "NewPass123"); throw new Exception("Wrong current password was accepted"); }
        catch (BSStore.Domain.Exceptions.BusinessRuleException) { }
        await auth.ChangePasswordAsync(user.Id, "OldPass123", "NewPass123");
        Check(BCrypt.Net.BCrypt.Verify("NewPass123", user.PasswordHash) && !BCrypt.Net.BCrypt.Verify("OldPass123", user.PasswordHash), "Password must be changed using hashing");
        Check((await db.RefreshTokens.FirstAsync(t => t.TokenHash == "old-session")).IsRevoked && await db.RefreshTokens.CountAsync(t => !t.IsRevoked) == 1, "Password change must revoke old sessions and retain a new current session");

        var client = new TestR2Client();
        var settings = new R2Settings(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> { ["STORAGE_PROVIDER"]="r2", ["R2_BUCKET_NAME"]="test" }).Build());
        var cleanup = new CatalogueImageCleanup(db, settings, new R2ObjectStore(client, settings), NullLogger<CatalogueImageCleanup>.Instance);
        var sharedKey = $"catalogue/products/{Guid.NewGuid():N}.jpg";
        var orphanKey = $"catalogue/stores/{Guid.NewGuid():N}.jpg";
        var sharedUrl = "https://api.test/api/images/" + sharedKey[10..];
        var orphanUrl = "https://api.test/api/images/" + orphanKey[10..];
        client.Objects[sharedKey] = [1]; client.Objects[orphanKey] = [2];
        var store = new Store { Name="المتجر", ImageKey=orphanUrl };
        var product = new Product { Name="المنتج", Store=store };
        db.ProductImages.Add(new ProductImage { Product=product, Url=sharedUrl, ImageKey=sharedUrl });
        db.AppSettings.Add(new AppSetting { Key="FlashDeals", Value=JsonSerializer.Serialize(new[] { new { id="offer", imageUrl=sharedUrl } }) });
        db.AddRange(store, product); await db.SaveChangesAsync();
        var admin = new AdminController(db, null!, cleanup);
        await admin.DeleteStore(store.Id, default);
        Check(store.IsDeleted && !store.IsActive && product.IsDeleted && await db.ProductImages.CountAsync() == 0, "Store deletion must persist and hide its products");
        client.FailDelete = true;
        await cleanup.ProcessAsync(default);
        Check(client.Objects.ContainsKey(orphanKey) && await db.AppSettings.AnyAsync(s => s.Key.StartsWith("ImageCleanup:")), "A temporary R2 failure must leave a durable deletion job");
        client.FailDelete = false;
        await cleanup.ProcessAsync(default);
        Check(!client.Objects.ContainsKey(orphanKey) && client.Objects.ContainsKey(sharedKey), "Delete store image but protect an image still used by an offer");
        await admin.SaveDeals(JsonDocument.Parse("[]").RootElement, default);
        await cleanup.ProcessAsync(default);
        Check(!client.Objects.ContainsKey(sharedKey), "Deleting the final offer reference must delete its R2 image");
        Check(CatalogueImageCleanup.Key("r2:private/receipts/test.jpg") == null && CatalogueImageCleanup.Key("../catalogue/stores/test.jpg") == null, "Catalogue cleanup cannot delete receipts or arbitrary paths");
        Console.WriteLine("PASS address edit/delete preserves order destinations, ownership/default checks, real account names, hashed password change/session revocation, persisted store/product deletion, shared image protection and offer image cleanup");
    }
    sealed class TestJwt : IJwtTokenService
    {
        public string GenerateAccessToken(Guid userId,string phone,string role) => "new-access";
        public (string token,string hash,DateTime expiry) GenerateRefreshToken() => ("new-refresh", Guid.NewGuid().ToString(), DateTime.UtcNow.AddDays(7));
        public Guid? GetUserIdFromToken(string token) => null;
    }
}
