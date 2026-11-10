using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Always stored trimmed and lower-cased.</summary>
    public string Email { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.User;

    public DateTimeOffset CreatedAt { get; set; }

    public List<Project> Projects { get; set; } = [];

    public List<RefreshToken> RefreshTokens { get; set; } = [];
}
