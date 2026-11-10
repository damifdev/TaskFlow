using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Common;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct);

    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct);

    Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct);

    Task LogoutAsync(RefreshRequest request, CancellationToken ct);

    Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct);
}

public sealed class AuthService(
    IAppDbContext db,
    IPasswordService passwords,
    ITokenService tokens,
    TimeProvider clock) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);

        if (await db.Users.AnyAsync(u => u.Email == email, ct))
        {
            throw new ConflictException("An account with this email already exists.");
        }

        var user = new User
        {
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = passwords.Hash(request.Password),
            Role = UserRole.User,
            CreatedAt = clock.GetUtcNow()
        };
        db.Users.Add(user);

        var response = CreateSession(user, replacing: null);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // The unique index on Email is the final guard against two concurrent registrations.
            if (await db.Users.AnyAsync(u => u.Email == email, ct))
            {
                throw new ConflictException("An account with this email already exists.");
            }

            throw;
        }

        return response;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // One message for both "unknown email" and "wrong password" so the endpoint cannot be used
        // to discover which emails are registered.
        if (user is null || !passwords.Verify(user.PasswordHash, request.Password))
        {
            throw new AuthenticationFailedException("Invalid email or password.");
        }

        // Housekeeping: drop this user's expired refresh tokens so the table does not grow forever.
        var now = clock.GetUtcNow();
        var expired = await db.RefreshTokens
            .Where(t => t.UserId == user.Id && t.ExpiresAt <= now)
            .ToListAsync(ct);
        db.RefreshTokens.RemoveRange(expired);

        var response = CreateSession(user, replacing: null);
        await db.SaveChangesAsync(ct);
        return response;
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct)
    {
        var hash = tokens.HashRefreshToken(request.RefreshToken);
        var stored = await db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null)
        {
            throw new AuthenticationFailedException("Invalid refresh token.");
        }

        var now = clock.GetUtcNow();

        if (stored.RevokedAt is not null)
        {
            // A token that was already rotated or revoked is being replayed. Assume it was stolen and
            // end every session for this user.
            await RevokeAllActiveAsync(stored.UserId, now, ct);
            throw new AuthenticationFailedException("Refresh token has been revoked.");
        }

        if (stored.ExpiresAt <= now)
        {
            throw new AuthenticationFailedException("Refresh token has expired.");
        }

        var response = CreateSession(stored.User, replacing: stored);
        await db.SaveChangesAsync(ct);
        return response;
    }

    public async Task LogoutAsync(RefreshRequest request, CancellationToken ct)
    {
        var hash = tokens.HashRefreshToken(request.RefreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        // Logging out is idempotent: an unknown or already revoked token is not an error.
        if (stored is { RevokedAt: null })
        {
            stored.RevokedAt = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");

        return ToDto(user);
    }

    /// <summary>
    /// Issues an access token plus a fresh refresh token and stages the refresh token for saving.
    /// When <paramref name="replacing"/> is set, that token is revoked and linked to its replacement.
    /// </summary>
    private AuthResponse CreateSession(User user, RefreshToken? replacing)
    {
        var now = clock.GetUtcNow();
        var accessToken = tokens.CreateAccessToken(user);
        var rawRefreshToken = tokens.GenerateRefreshToken();
        var refreshTokenHash = tokens.HashRefreshToken(rawRefreshToken);

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            CreatedAt = now,
            ExpiresAt = now.Add(tokens.RefreshTokenLifetime)
        });

        if (replacing is not null)
        {
            replacing.RevokedAt = now;
            replacing.ReplacedByTokenHash = refreshTokenHash;
        }

        return new AuthResponse(accessToken.Value, rawRefreshToken, accessToken.ExpiresAt, ToDto(user));
    }

    private async Task RevokeAllActiveAsync(Guid userId, DateTimeOffset now, CancellationToken ct)
    {
        var active = await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);

        foreach (var token in active)
        {
            token.RevokedAt = now;
        }

        await db.SaveChangesAsync(ct);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static UserDto ToDto(User user) => new(user.Id, user.Email, user.DisplayName, user.Role);
}
