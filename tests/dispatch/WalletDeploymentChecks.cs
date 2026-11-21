using System.Diagnostics;
using System.Text.Json;
using Npgsql;

static class WalletDeploymentChecks
{
    public static async Task BackupAsync()
    {
        var settings = ProductionLatency.Settings();
        var target = $"/workspace/.tools/wallet-database-before-{DateTime.UtcNow:yyyyMMdd-HHmmss}.dump";
        using (File.Create(target)) { }
        File.SetUnixFileMode(target, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        var start = new ProcessStartInfo(File.Exists("/usr/lib/postgresql/17/bin/pg_dump") ? "/usr/lib/postgresql/17/bin/pg_dump" : "/usr/bin/pg_dump") { RedirectStandardError = true, RedirectStandardOutput = true, UseShellExecute = false };
        foreach (var arg in new[] { "--format=custom", "--no-owner", "--no-privileges", "--file", target }) start.ArgumentList.Add(arg);
        // Secrets travel through the child environment, never argv, source or output.
        start.Environment["PGHOST"] = settings.Host; start.Environment["PGPORT"] = settings.Port.ToString();
        start.Environment["PGDATABASE"] = settings.Database; start.Environment["PGUSER"] = settings.Username;
        start.Environment["PGPASSWORD"] = settings.Password; start.Environment["PGSSLMODE"] = settings.SslMode == SslMode.Require ? "require" : "prefer";
        using var process = Process.Start(start)!;
        var errors = process.StandardError.ReadToEndAsync(); var output = process.StandardOutput.ReadToEndAsync();
        await process.WaitForExitAsync(); await output;
        if (process.ExitCode != 0) { File.Delete(target); throw new Exception("Database backup failed: " + await errors); }
        Console.WriteLine(JsonSerializer.Serialize(new { backup = target, bytes = new FileInfo(target).Length }));
    }

    public static async Task StatusAsync()
    {
        await using var source = NpgsqlDataSource.Create(ProductionLatency.Settings().ConnectionString);
        await using var connection = await source.OpenConnectionAsync();
        await using var tx = await connection.BeginTransactionAsync();
        await using (var readOnly = new NpgsqlCommand("SET TRANSACTION READ ONLY", connection, tx)) await readOnly.ExecuteNonQueryAsync();
        async Task<long> Count(string sql) { await using var command = new NpgsqlCommand(sql, connection, tx); return Convert.ToInt64(await command.ExecuteScalarAsync()); }
        var result = new {
            checkedAt = DateTime.UtcNow,
            migrationInstalled = await Count("SELECT count(*) FROM \"__EFMigrationsHistory\" WHERE \"MigrationId\" LIKE '%_AddCustomerWallet'") == 1,
            sharedPaymentMethodsInstalled = await Count("SELECT count(*) FROM \"__EFMigrationsHistory\" WHERE \"MigrationId\" LIKE '%_SharedPaymentMethods'") == 1,
            methods = await Count("SELECT count(*) FROM \"WalletMethods\""),
            activeMethods = await Count("SELECT count(*) FROM \"WalletMethods\" WHERE \"IsActive\""),
            negativeBalances = await Count("SELECT count(*) FROM \"Customers\" WHERE \"WalletBalance\" < 0"),
            balanceMismatches = await Count("SELECT count(*) FROM \"Customers\" c WHERE c.\"WalletBalance\" <> COALESCE((SELECT SUM(t.\"Amount\") FROM \"WalletTransactions\" t WHERE t.\"CustomerId\" = c.\"Id\"), 0)"),
            immutableLedger = await Count("SELECT count(*) FROM pg_trigger WHERE tgname = 'wallet_ledger_immutable' AND NOT tgisinternal") == 1
        };
        Console.WriteLine(JsonSerializer.Serialize(result));
        if (!result.migrationInstalled || !result.immutableLedger || result.negativeBalances != 0 || result.balanceMismatches != 0) throw new Exception("Wallet production reconciliation failed");
    }
}
