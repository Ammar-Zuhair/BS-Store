using System.Diagnostics;
using System.Text.Json;
using Npgsql;

static class ProductionQueryChecks
{
    public static async Task RunAsync()
    {
        await using var source = NpgsqlDataSource.Create(ProductionLatency.Settings().ConnectionString);
        await using var connection = await source.OpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        await using (var readOnly = new NpgsqlCommand("SET TRANSACTION READ ONLY", connection, transaction)) await readOnly.ExecuteNonQueryAsync();
        var queries = new Dictionary<string, string> {
            ["category-product-counts"] = """
                SELECT c."Id", (SELECT count(*) FROM "Products" p WHERE p."CategoryId" = c."Id" AND NOT p."IsDeleted")
                FROM "Categories" c ORDER BY c."SortOrder"
                """,
            ["driver-ledger-aggregate"] = """
                SELECT "DriverId", sum(CASE WHEN "Type" = 0 THEN "Amount" ELSE 0 END)
                FROM "DriverTransactions" GROUP BY "DriverId"
                """,
            ["recent-order-aggregate"] = """
                SELECT count(*), sum("TotalAmount") FROM "Orders" WHERE "CreatedAt" >= now() - interval '2 days'
                """,
            ["pending-dispatch"] = """
                SELECT "Id" FROM "Orders" WHERE "DriverId" IS NULL AND "Status" IN ('Confirmed','SearchingDriver')
                ORDER BY "CreatedAt" LIMIT 100
                """
        };
        var results = new List<object>();
        foreach (var (name, sql) in queries) {
            var clock = Stopwatch.StartNew();
            await using var command = new NpgsqlCommand("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + sql, connection, transaction);
            var json = (await command.ExecuteScalarAsync())?.ToString() ?? "[]";
            using var plan = JsonDocument.Parse(json);
            var summary = plan.RootElement[0];
            results.Add(new { query = name, roundTripMs = Math.Round(clock.Elapsed.TotalMilliseconds, 2),
                planningMs = summary.GetProperty("Planning Time").GetDouble(), executionMs = summary.GetProperty("Execution Time").GetDouble(),
                returnedRows = summary.GetProperty("Plan").GetProperty("Actual Rows").GetInt64() });
        }
        await transaction.RollbackAsync();
        var output = JsonSerializer.Serialize(new { measuredAt = DateTime.UtcNow, mode = "Read-only EXPLAIN ANALYZE; no user rows or credentials exported", results }, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync("/workspace/docs/production-query-diagnostics.json", output); Console.WriteLine(output);
    }
}
