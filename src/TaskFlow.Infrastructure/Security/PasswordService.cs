using Microsoft.AspNetCore.Identity;
using TaskFlow.Application.Abstractions;

namespace TaskFlow.Infrastructure.Security;

/// <summary>
/// Wraps ASP.NET Core's PasswordHasher (PBKDF2 with a per-password salt and an upgradable format)
/// instead of hand-rolling password hashing.
/// </summary>
public sealed class PasswordService : IPasswordService
{
    // The hasher only needs a user object for custom schemes; the default implementation ignores it.
    private static readonly object Subject = new();

    private readonly PasswordHasher<object> _hasher = new();

    public string Hash(string password) => _hasher.HashPassword(Subject, password);

    public bool Verify(string passwordHash, string password) =>
        _hasher.VerifyHashedPassword(Subject, passwordHash, password) != PasswordVerificationResult.Failed;
}
