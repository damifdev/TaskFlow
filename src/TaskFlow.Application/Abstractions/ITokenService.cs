using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Abstractions;

public sealed record AccessToken(string Value, DateTimeOffset ExpiresAt);

public interface ITokenService
{
    TimeSpan RefreshTokenLifetime { get; }

    AccessToken CreateAccessToken(User user);

    /// <summary>Creates a new cryptographically random refresh token (the raw value sent to the client).</summary>
    string GenerateRefreshToken();

    /// <summary>Hashes a refresh token so only the hash is persisted.</summary>
    string HashRefreshToken(string refreshToken);
}
