using System.Diagnostics;
using System.Text.Json;
using BSStore.Infrastructure.Common;
using Npgsql;

static class ProductionLatency
{
    public static NpgsqlConnectionStringBuilder Settings()
    {
        EnvLoader.Load("/workspace/backend/publish");
        var configuration = new ConfigurationBuilder().SetBasePath("/workspace/backend/publish")
            .AddJsonFile("appsettings.json", optional: true).AddEnvironmentVariables().Build();
        var raw = configuration.GetConnectionString("DefaultConnection");
        NpgsqlConnectionStringBuilder settings;
        if (raw?.StartsWith("postgres", StringComparison.OrdinalIgnoreCase) == true)
        {
            var uri = new Uri(raw); var user = uri.UserInfo.Split(':', 2);
            settings = new() { Host = uri.Host, Port = uri.Port > 0 ? uri.Port : 5432, Database = uri.AbsolutePath.TrimStart('/'),
                Username = Uri.UnescapeDataString(user[0]), Password = Uri.UnescapeDataString(user[1]) };
        }
        else if (!string.IsNullOrWhiteSpace(raw)) settings = new(raw);
        else settings = new() { Host = configuration["DB_HOST"] ?? "localhost", Port = int.Parse(configuration["DB_PORT"] ?? "5432"),
            Database = configuration["DB_NAME"] ?? "BS_Store", Username = configuration["DB_USER"] ?? "postgres", Password = configuration["DB_PASSWORD"] ?? "" };
        settings.MaxPoolSize = 25; settings.MinPoolSize = 1; settings.Timeout = 15; settings.CommandTimeout = 30;
        if (settings.Host is not ("localhost" or "127.0.0.1")) settings.SslMode = SslMode.Require;
        return settings;
    }

    // Read-only probe of the configured production DB, never creates orders or loads user rows.
    public static async Task RunAsync()
    {
        var settings = Settings();
        await using var source = NpgsqlDataSource.Create(settings.ConnectionString);
        var values = new List<double>();
        await using (var warm = source.CreateCommand("SELECT 1")) await warm.ExecuteScalarAsync();
        for (var i = 0; i < 20; i++)
        {
            var watch = Stopwatch.StartNew();
            await using var command = source.CreateCommand("SELECT 1"); await command.ExecuteScalarAsync();
            values.Add(watch.Elapsed.TotalMilliseconds);
        }
        values.Sort();
        var result = new { measuredAt = DateTime.UtcNow, remoteDatabase = settings.Host is not ("localhost" or "127.0.0.1"),
            samples = values.Count, medianRoundTripMs = Math.Round(values[10], 2), p95RoundTripMs = Math.Round(values[19], 2),
            note = "Read-only SELECT 1 over the configured production connection; not checkout throughput." };
        var json = JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync("/workspace/docs/production-db-latency.json", json); Console.WriteLine(json);
    }
}
