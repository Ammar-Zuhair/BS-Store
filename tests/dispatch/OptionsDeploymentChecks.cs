using System.Text.Json;
using Npgsql;

static class OptionsDeploymentChecks
{
    // Deployment metadata only: no customer records, tokens, or catalogue contents are exported.
    public static async Task RunAsync()
    {
        await using var source = NpgsqlDataSource.Create(ProductionLatency.Settings().ConnectionString);
        await using var connection = await source.OpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        await using (var command = new NpgsqlCommand("SET TRANSACTION READ ONLY", connection, transaction)) await command.ExecuteNonQueryAsync();
        string? json;
        await using (var command = new NpgsqlCommand("SELECT \"Value\" FROM \"AppSettings\" WHERE \"Key\" = 'FlashDeals' LIMIT 1", connection, transaction))
            json = (await command.ExecuteScalarAsync())?.ToString();
        using var doc = JsonDocument.Parse(json ?? "[]");
        var ids = new HashSet<string>(); var duplicateDealIds = 0; var duplicatePieceIds = 0; var missingPieceIds = 0; var bundles = 0; var pieces = 0;
        foreach (var deal in doc.RootElement.EnumerateArray())
        {
            var id = deal.TryGetProperty("id", out var dealId) ? dealId.ToString() : "";
            if (string.IsNullOrWhiteSpace(id) || !ids.Add(id)) duplicateDealIds++;
            var kind = deal.TryGetProperty("dealKind", out var k) ? k.ToString() : deal.TryGetProperty("dealType", out k) ? k.ToString() : "";
            if (kind != "BUNDLE") continue;
            bundles++;
            if (!deal.TryGetProperty("products", out var items) && !deal.TryGetProperty("bundleItems", out items)) continue;
            var pieceIds = new HashSet<string>();
            foreach (var piece in items.EnumerateArray())
            {
                pieces++;
                var pieceId = piece.TryGetProperty("id", out var p) ? p.ToString() : "";
                if (string.IsNullOrWhiteSpace(pieceId)) missingPieceIds++;
                else if (!pieceIds.Add(pieceId)) duplicatePieceIds++;
            }
        }
        bool schemaInstalled;
        await using (var command = new NpgsqlCommand("SELECT to_regclass('public.\"BundlePieces\"') IS NOT NULL", connection, transaction))
            schemaInstalled = (bool)(await command.ExecuteScalarAsync())!;
        long? normalizedPieces = null;
        if (schemaInstalled) await using (var command = new NpgsqlCommand("SELECT count(*) FROM \"BundlePieces\" WHERE \"IsActive\"", connection, transaction))
            normalizedPieces = (long)(await command.ExecuteScalarAsync())!;
        bool backfillComplete;
        await using (var command = new NpgsqlCommand("SELECT EXISTS(SELECT 1 FROM \"AppSettings\" WHERE \"Key\" = 'ProductOptions:BundleBackfill:v1' AND \"Value\" = 'complete')", connection, transaction))
            backfillComplete = (bool)(await command.ExecuteScalarAsync())!;
        await transaction.RollbackAsync();
        var report = JsonSerializer.Serialize(new { measuredAt = DateTime.UtcNow, mode = "Read-only deployment checks", bundles, pieces,
            duplicateDealIds, duplicatePieceIds, missingPieceIds, schemaInstalled, normalizedPieces, backfillComplete }, new JsonSerializerOptions { WriteIndented = true });
        Console.WriteLine(report);
        if (duplicateDealIds + duplicatePieceIds > 0) throw new InvalidOperationException("Bundle identities need correction before migration.");
    }
}
