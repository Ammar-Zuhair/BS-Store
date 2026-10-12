using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BSStore.API.Services;
using BSStore.Domain.Entities;
using BSStore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

static class OptionsChecks
{
    public static async Task RunAsync(WebApplication app, HttpClient http, Customer customer, Store store, Category category, Action<bool, string> check)
    {
        async Task<(HttpStatusCode Status, JsonElement Json)> Call(HttpMethod method, string path, object? body = null, string role = "Admin")
        {
            using var request = new HttpRequestMessage(method, path);
            request.Headers.Add("X-Test-User", customer.UserId.ToString()); request.Headers.Add("X-Test-Role", role);
            if (body != null) request.Content = JsonContent.Create(body);
            using var response = await http.SendAsync(request);
            var text = await response.Content.ReadAsStringAsync();
            using var json = JsonDocument.Parse(string.IsNullOrEmpty(text) ? "{}" : text);
            return (response.StatusCode, json.RootElement.Clone());
        }
        async Task<Guid> ProductId(string name)
        {
            using var scope = app.Services.CreateScope(); return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Products.Where(p => p.Name == name).Select(p => p.Id).SingleAsync();
        }
        var color = Guid.NewGuid(); var size = Guid.NewGuid();
        var black = Guid.NewGuid(); var white = Guid.NewGuid(); var medium = Guid.NewGuid(); var large = Guid.NewGuid();
        object Definition(bool disableBlack = false, string blackName = "أسود", string? image = "https://example.test/api/images/products/11111111111111111111111111111111.jpg") => new {
            groups = new object[] {
                new { id = color, name = "اللون", values = new object[] { new { id = black, name = blackName, imageUrl = image }, new { id = white, name = "أبيض" } } },
                new { id = size, name = "المقاس", values = new object[] { new { id = medium, name = "M" }, new { id = large, name = "L" } } }
            },
            variants = new object[] {
                new { valueIds = new[] { black, medium }, sellingPrice = 150m, expectedPurchasePrice = 110m, isActive = !disableBlack },
                new { valueIds = new[] { white, large }, isActive = false }
            }
        };
        var create = new { name = "Variant shirt", categoryId = category.Id, storeId = store.Id, sellingPrice = 100m, expectedPurchasePrice = 80m, options = Definition() };
        var result = await Call(HttpMethod.Post, "/api/admin/products", create);
        check(result.Status == HttpStatusCode.OK, "admin creates a product with dynamic groups and optional images");
        var id = await ProductId("Variant shirt");
        result = await Call(HttpMethod.Get, $"/api/products/{id}", role: "Customer");
        var data = result.Json.GetProperty("data"); var options = data.GetProperty("options");
        check(data.GetProperty("hasOptions").GetBoolean() && options.GetProperty("groups").GetArrayLength() == 2, "public detail returns option groups");
        var variants = options.GetProperty("variants").EnumerateArray().ToList();
        check(variants.Count == 3, "unavailable combinations are excluded from public selection");
        check(variants.All(v => v.GetProperty("expectedPurchasePrice").ValueKind == JsonValueKind.Null && v.GetProperty("expectedPurchasePriceOverride").ValueKind == JsonValueKind.Null), "public options never expose purchase costs");
        Guid Variant(JsonElement spec, params Guid[] ids) => spec.GetProperty("variants").EnumerateArray().Single(v => v.GetProperty("valueIds").EnumerateArray().Select(i => i.GetGuid()).Order().SequenceEqual(ids.Order())).GetProperty("id").GetGuid();
        var blackVariant = Variant(options, black, medium); var whiteVariant = Variant(options, white, medium);
        check(variants.Single(v => v.GetProperty("id").GetGuid() == blackVariant).GetProperty("sellingPrice").GetDecimal() == 150m, "combination-specific selling price is resolved");
        check(variants.Single(v => v.GetProperty("id").GetGuid() == whiteVariant).GetProperty("sellingPrice").GetDecimal() == 100m, "empty price inherits product baseline");
        result = await Call(HttpMethod.Get, "/api/products?pageSize=100", role: "Customer");
        var summary = result.Json.GetProperty("data").GetProperty("items").EnumerateArray().Single(p => p.GetProperty("id").GetGuid() == id);
        check(summary.GetProperty("hasOptions").GetBoolean() && summary.GetProperty("options").ValueKind == JsonValueKind.Null, "catalog lists keep full option matrices out of their payload");
        result = await Call(HttpMethod.Post, "/api/cart/items", new { productId = id, quantity = 1 }, "Customer");
        check(result.Status == HttpStatusCode.BadRequest, "cart rejects a configured product without a selection");
        result = await Call(HttpMethod.Post, "/api/cart/items", new { productId = id, quantity = 1, variantId = blackVariant, imageValueId = white }, "Customer");
        check(result.Status == HttpStatusCode.BadRequest, "cart rejects an image value outside the selected variant");
        foreach (var variant in new[] { blackVariant, whiteVariant, blackVariant })
        {
            result = await Call(HttpMethod.Post, "/api/cart/items", new { productId = id, quantity = 1, variantId = variant }, "Customer");
            check(result.Status == HttpStatusCode.OK, "cart accepts an available variant");
        }
        result = await Call(HttpMethod.Get, "/api/cart", role: "Customer");
        var cartLines = result.Json.GetProperty("data").GetProperty("items").EnumerateArray().Where(i => i.GetProperty("productId").ValueKind == JsonValueKind.String && i.GetProperty("productId").GetGuid() == id).ToList();
        check(cartLines.Count == 2 && cartLines.Single(i => i.GetProperty("variantId").GetGuid() == blackVariant).GetProperty("quantity").GetInt32() == 2, "same variant merges quantity while distinct variants stay separate");
        result = await Call(HttpMethod.Post, "/api/checkout/place-order", new { addressId = customer.Addresses.FirstOrDefault()?.Id, newAddress = new { city = "Test", district = "Test", street = "Test", latitude = 15m, longitude = 44m }, paymentMethod = 0,
            idempotencyKey = Guid.NewGuid().ToString(), items = new[] { new { productId = id, variantId = blackVariant, quantity = 1, imageValueId = (Guid?)black }, new { productId = id, variantId = whiteVariant, quantity = 2, imageValueId = (Guid?)null } } }, "Customer");
        check(result.Status == HttpStatusCode.OK, "checkout accepts two configurations of the same catalog product");
        var orderId = result.Json.GetProperty("data").GetProperty("id").GetGuid();
        var orderLines = result.Json.GetProperty("data").GetProperty("subOrders")[0].GetProperty("items");
        check(orderLines.GetArrayLength() == 2 && result.Json.GetProperty("data").GetProperty("subTotal").GetDecimal() == 350m, "variant-aware checkout quantities and totals are correct");
        check(orderLines.EnumerateArray().Any(i => i.GetProperty("productName").GetString()!.Contains("اللون: أسود") && i.GetProperty("imageUrl").GetString()!.Contains("111111")), "order preserves selected labels and image for installed older clients");
        // Separate owners must never reuse a group's/value's IDs.
        result = await Call(HttpMethod.Post, "/api/admin/products", new { name = "Foreign owner", categoryId = category.Id, storeId = store.Id, sellingPrice = 100m, expectedPurchasePrice = 80m, options = Definition() });
        check(result.Status == HttpStatusCode.BadRequest, "option group IDs cannot be attached to another product");
        // Independent piece definitions use their own IDs and variants.
        var pieceGroup = Guid.NewGuid(); var storage128 = Guid.NewGuid(); var storage256 = Guid.NewGuid();
        var pieceDefinition = new { groups = new[] { new { id = pieceGroup, name = "السعة", values = new[] { new { id = storage128, name = "128 GB" }, new { id = storage256, name = "256 GB" } } } },
            variants = new[] { new { valueIds = new[] { storage256 }, sellingPrice = 150m, expectedPurchasePrice = 110m, isActive = true } } };
        object Deal(object definition) => new[] { new { id = "options-bundle", title = "Phone bundle", dealKind = "BUNDLE", dealType = "BUNDLE", storeId = store.Id, isActive = true, isPublic = true,
            expiresAt = DateTime.UtcNow.AddDays(2), originalPrice = 400m, discountPrice = 300m, products = new object[] {
                new { id = "phone-piece", name = "Phone", price = 100m, expectedPurchasePrice = 80m, options = definition },
                new { id = "accessory-piece", name = "Accessory", price = 300m, expectedPurchasePrice = 200m }
            } } };
        result = await Call(HttpMethod.Post, "/api/admin/deals", Deal(pieceDefinition));
        check(result.Status == HttpStatusCode.OK, "admin saves independent bundle-piece options atomically");
        result = await Call(HttpMethod.Get, "/api/deals/options-bundle/pieces/phone-piece", role: "Customer");
        var pieceOptions = result.Json.GetProperty("data").GetProperty("options");
        var largeStorage = Variant(pieceOptions, storage256); var smallStorage = Variant(pieceOptions, storage128);
        result = await Call(HttpMethod.Get, "/api/deals", role: "Customer");
        var publicPiece = result.Json.EnumerateArray().Single(d => d.GetProperty("id").GetString() == "options-bundle").GetProperty("products")[0];
        check(publicPiece.GetProperty("hasOptions").GetBoolean() && publicPiece.GetProperty("minSellingPrice").GetDecimal() == 100m &&
            publicPiece.GetProperty("maxSellingPrice").GetDecimal() == 150m && !publicPiece.TryGetProperty("expectedPurchasePrice", out _), "bundle summaries expose price ranges without option matrices or private costs");
        result = await Call(HttpMethod.Post, "/api/admin/deals", Deal(new { groups = new[] { new { id = pieceGroup, name = "السعة", values = new[] { new { id = storage128, name = "128 GB" } } } },
            variants = new[] { new { valueIds = new[] { Guid.NewGuid() }, sellingPrice = 12m } } }));
        check(result.Status == HttpStatusCode.BadRequest, "invalid piece definitions fail before publishing a partial bundle edit");
        result = await Call(HttpMethod.Get, "/api/deals/options-bundle/pieces/phone-piece", role: "Customer");
        check(Variant(result.Json.GetProperty("data").GetProperty("options"), storage256) == largeStorage, "failed bundle save preserves every previous piece and variant");
        result = await Call(HttpMethod.Post, "/api/checkout/place-order", new { newAddress = new { city = "Test", district = "Test", street = "Test", latitude = 15m, longitude = 44m }, paymentMethod = 0,
            items = new[] { new { dealId = "options-bundle", dealProductId = "phone-piece", variantId = largeStorage, quantity = 1 } } }, "Customer");
        check(result.Status == HttpStatusCode.OK && result.Json.GetProperty("data").GetProperty("subTotal").GetDecimal() == 150m, "individual bundle piece uses its selected variant price");
        result = await Call(HttpMethod.Post, "/api/cart/items", new { dealId = "options-bundle", quantity = 1 }, "Customer");
        check(result.Status == HttpStatusCode.BadRequest, "whole bundle requires selections for every configured piece");
        result = await Call(HttpMethod.Post, "/api/checkout/place-order", new { newAddress = new { city = "Test", district = "Test", street = "Test", latitude = 15m, longitude = 44m }, paymentMethod = 0,
            items = new[] { new { dealId = "options-bundle", quantity = 2, bundleSelections = new[] { new { dealProductId = "phone-piece", variantId = largeStorage } } } } }, "Customer");
        check(result.Status == HttpStatusCode.OK, "whole bundle accepts a configuration for each required piece");
        var bundleLines = result.Json.GetProperty("data").GetProperty("subOrders")[0].GetProperty("items").EnumerateArray().ToList();
        check(result.Json.GetProperty("data").GetProperty("subTotal").GetDecimal() == 675m && bundleLines.Sum(i => i.GetProperty("totalPrice").GetDecimal()) == 675m, "bundle applies exact 25-percent discount to selected pieces and quantity");
        check(bundleLines.Count == 2 && bundleLines.Select(i => i.GetProperty("bundleGroupId").GetGuid()).Distinct().Count() == 1 && bundleLines.All(i => i.GetProperty("quantity").GetInt32() == 2), "bundle order retains grouped physical pieces and quantities");
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var bundleOrder = result.Json.GetProperty("data").GetProperty("id").GetGuid();
            check(await db.OrderItems.Where(i => i.SubOrder.OrderId == bundleOrder).SumAsync(i => i.ExpectedPurchasePriceSnapshot * i.Quantity) == 620m, "bundle purchase costs remain independent of the discounted selling amount");
        }
        foreach (var variant in new[] { largeStorage, smallStorage }) {
            result = await Call(HttpMethod.Post, "/api/cart/items", new { dealId = "options-bundle", quantity = 1, bundleSelections = new[] { new { dealProductId = "phone-piece", variantId = variant } } }, "Customer");
            check(result.Status == HttpStatusCode.OK, "whole bundle configuration can be persisted in the cart");
        }
        result = await Call(HttpMethod.Get, "/api/cart", role: "Customer");
        check(result.Json.GetProperty("data").GetProperty("items").EnumerateArray().Count(i => i.GetProperty("dealId").ValueKind == JsonValueKind.String && i.GetProperty("dealId").GetString() == "options-bundle") == 2, "different whole-bundle configurations remain separate cart rows");
        result = await Call(HttpMethod.Post, "/api/cart/items", new { dealId = "options-bundle", dealProductId = "phone-piece", variantId = blackVariant, quantity = 1 }, "Customer");
        check(result.Status == HttpStatusCode.BadRequest, "bundle piece rejects a catalog product's variant ID");
        result = await Call(HttpMethod.Put, $"/api/admin/products/{id}", new { name = "Renamed shirt", categoryId = category.Id, storeId = store.Id, sellingPrice = 100m, expectedPurchasePrice = 80m, isActive = true,
            options = Definition(true, "أسود داكن", "https://example.test/api/images/products/22222222222222222222222222222222.jpg") });
        check(result.Status == HttpStatusCode.OK, "manager can rename options, replace images and disable combinations");
        result = await Call(HttpMethod.Get, $"/api/orders/{orderId}", role: "Customer");
        check(result.Status == HttpStatusCode.OK && result.Json.GetProperty("data").GetProperty("subOrders")[0].GetProperty("items").EnumerateArray().Any(i => i.GetProperty("productName").GetString()!.Contains("اللون: أسود") && i.GetProperty("imageUrl").GetString()?.Contains("111111") == true), "past order names and photos do not change with catalog edits");
        result = await Call(HttpMethod.Post, "/api/cart/items", new { productId = id, variantId = blackVariant, quantity = 1 }, "Customer");
        check(result.Status == HttpStatusCode.BadRequest, "disabled configuration is rejected after a catalog edit");
        result = await Call(HttpMethod.Put, $"/api/admin/products/{id}", new { name = "Renamed shirt", categoryId = category.Id, storeId = store.Id, sellingPrice = 105m, expectedPurchasePrice = 80m, isActive = true });
        check(result.Status == HttpStatusCode.OK, "legacy admin update can omit option fields without deleting them");
        result = await Call(HttpMethod.Get, $"/api/products/{id}", role: "Customer");
        check(result.Json.GetProperty("data").GetProperty("hasOptions").GetBoolean(), "options survive installed older manager requests");
        var stableOptions = result.Json.GetProperty("data").GetProperty("options");
        check(Variant(stableOptions, white, medium) == whiteVariant, "renaming and pricing changes preserve variant identity");
        result = await Call(HttpMethod.Put, $"/api/admin/products/{id}", new { name = "Should roll back", categoryId = category.Id, storeId = store.Id, sellingPrice = 999m, expectedPurchasePrice = 998m,
            options = new { groups = new[] { new { id = Guid.NewGuid(), name = "Too many", values = Enumerable.Range(0, 1001).Select(n => new { id = Guid.NewGuid(), name = n.ToString() }).ToArray() } } } });
        check(result.Status == HttpStatusCode.BadRequest, "server rejects more than 1000 combinations");
        result = await Call(HttpMethod.Get, $"/api/products/{id}", role: "Customer");
        check(result.Json.GetProperty("data").GetProperty("name").GetString() == "Renamed shirt" && Variant(result.Json.GetProperty("data").GetProperty("options"), white, medium) == whiteVariant,
            "invalid option edits roll back base product fields as well as options");
        // A very small per-piece discounted price must not create a negative line.
        var tinyDeal = new { id = "tiny-rounding", title = "Tiny bundle", dealKind = "BUNDLE", storeId = store.Id, isActive = true, isPublic = true,
            expiresAt = DateTime.UtcNow.AddDays(2), discountPrice = 0.75m, products = Enumerable.Range(0, 100).Select(n => new { id = "tiny-" + n, name = "Tiny " + n, price = 0.01m }).ToArray() };
        result = await Call(HttpMethod.Post, "/api/admin/deals", new object[] { tinyDeal });
        check(result.Status == HttpStatusCode.OK, "manager can save bundles with small monetary amounts");
        result = await Call(HttpMethod.Post, "/api/checkout/place-order", new { newAddress = new { city = "Test", district = "Test", street = "Test", latitude = 15m, longitude = 44m }, paymentMethod = 0,
            items = new[] { new { dealId = "tiny-rounding", quantity = 1 } } }, "Customer");
        check(result.Status == HttpStatusCode.OK && result.Json.GetProperty("data").GetProperty("subTotal").GetDecimal() == 0.75m &&
            result.Json.GetProperty("data").GetProperty("subOrders")[0].GetProperty("items").EnumerateArray().All(i => i.GetProperty("unitPrice").GetDecimal() >= 0), "bundle rounding allocation preserves exact total without negative prices");
        var longGroups = Enumerable.Range(0, 3).Select(n => new { id = Guid.NewGuid(), name = n + new string('س', 75), values = new[] { new { id = Guid.NewGuid(), name = new string('ق', 75) } } }).ToArray();
        result = await Call(HttpMethod.Post, "/api/admin/products", new { name = "Long selection", categoryId = category.Id, storeId = store.Id, sellingPrice = 100m, expectedPurchasePrice = 80m, options = new { groups = longGroups } });
        check(result.Status == HttpStatusCode.OK, "manager can save valid long dynamic option names");
        var longProduct = await ProductId("Long selection");
        result = await Call(HttpMethod.Get, $"/api/products/{longProduct}", role: "Customer");
        var longVariant = result.Json.GetProperty("data").GetProperty("options").GetProperty("variants")[0].GetProperty("id").GetGuid();
        result = await Call(HttpMethod.Post, "/api/checkout/place-order", new { newAddress = new { city = "Test", district = "Test", street = "Test", latitude = 15m, longitude = 44m }, paymentMethod = 0,
            items = new[] { new { productId = longProduct, variantId = longVariant, quantity = 1 } } }, "Customer");
        check(result.Status == HttpStatusCode.OK && result.Json.GetProperty("data").GetProperty("subOrders")[0].GetProperty("items")[0].GetProperty("productName").GetString()!.Length > 300,
            "long selected labels persist without breaking the order snapshot column");
        var ratioGroup = Guid.NewGuid(); var ratioSmall = Guid.NewGuid(); var ratioLarge = Guid.NewGuid();
        var ratioDefinition = new { groups = new[] { new { id = ratioGroup, name = "Capacity", values = new[] { new { id = ratioSmall, name = "Small" }, new { id = ratioLarge, name = "Large" } } } },
            variants = new[] { new { valueIds = new[] { ratioLarge }, sellingPrice = 14m } } };
        object RatioDeal(bool reordered = false) {
            var first = new { id = "ratio-choice", name = reordered ? "Renamed piece" : "Choice", price = 3m, expectedPurchasePrice = 2m, options = reordered ? null : ratioDefinition };
            var second = new { id = "ratio-other", name = "Other", price = 4m, expectedPurchasePrice = 3m };
            return new[] { new { id = "ratio-bundle", title = "Exact ratio", dealKind = "BUNDLE", storeId = store.Id, isActive = true, isPublic = true,
                expiresAt = DateTime.UtcNow.AddDays(2), discountPrice = 5m, products = reordered ? new object[] { second, first } : new object[] { first, second } } };
        }
        result = await Call(HttpMethod.Post, "/api/admin/deals", RatioDeal());
        check(result.Status == HttpStatusCode.OK, "bundle stores a precise fractional discount ratio");
        result = await Call(HttpMethod.Get, "/api/deals/ratio-bundle/pieces/ratio-choice", role: "Customer");
        var ratioVariant = Variant(result.Json.GetProperty("data").GetProperty("options"), ratioLarge);
        result = await Call(HttpMethod.Post, "/api/admin/deals", RatioDeal(true));
        check(result.Status == HttpStatusCode.OK, "bundle pieces can be reordered and renamed without resending options");
        result = await Call(HttpMethod.Get, "/api/deals/ratio-bundle/pieces/ratio-choice", role: "Customer");
        check(Variant(result.Json.GetProperty("data").GetProperty("options"), ratioLarge) == ratioVariant, "piece and variant identities survive bundle reorder and rename");
        result = await Call(HttpMethod.Post, "/api/checkout/place-order", new { newAddress = new { city = "Test", district = "Test", street = "Test", latitude = 15m, longitude = 44m }, paymentMethod = 0,
            items = new[] { new { dealId = "ratio-bundle", quantity = 1, bundleSelections = new[] { new { dealProductId = "ratio-choice", variantId = ratioVariant } } } } }, "Customer");
        check(result.Status == HttpStatusCode.OK && result.Json.GetProperty("data").GetProperty("subTotal").GetDecimal() == 12.86m,
            "bundle uses exact 5/7 price ratio rather than a rounded percentage");
    }

}
