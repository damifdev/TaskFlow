using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Infrastructure.Security;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>HMAC signing key. Supplied through user-secrets or environment variables, never committed.</summary>
    [Required, MinLength(32)]
    public string Key { get; set; } = string.Empty;

    [Required]
    public string Issuer { get; set; } = "TaskFlow";

    [Required]
    public string Audience { get; set; } = "TaskFlow.Client";

    [Range(1, 1440)]
    public int AccessTokenMinutes { get; set; } = 15;

    [Range(1, 90)]
    public int RefreshTokenDays { get; set; } = 7;
}
