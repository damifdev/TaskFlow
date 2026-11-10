namespace TaskFlow.Infrastructure.Persistence;

public sealed class SeedOptions
{
    public const string SectionName = "Seed";

    /// <summary>Creates a demo user with sample data on startup. Leave off in production.</summary>
    public bool Enabled { get; set; }

    public string DemoPassword { get; set; } = "Demo1234";

    /// <summary>An admin account is only created when a password is configured.</summary>
    public string? AdminPassword { get; set; }
}
