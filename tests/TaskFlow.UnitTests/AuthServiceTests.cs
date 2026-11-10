using Microsoft.EntityFrameworkCore;
using Moq;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Auth;
using TaskFlow.Application.Common;
using TaskFlow.Domain.Entities;
using TaskFlow.Infrastructure.Persistence;
using TaskFlow.Infrastructure.Security;

namespace TaskFlow.UnitTests;

public sealed class AuthServiceTests
{
    private static readonly DateTimeOffset Start = new(2026, 1, 15, 9, 0, 0, TimeSpan.Zero);

    private readonly AppDbContext _db = TestDb.Create();
    private readonly TestClock _clock = new(Start);
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        // Passwords use the real hasher; tokens are mocked so refresh values are predictable
        // ("refresh-1", "refresh-2", ...) and rotation can be asserted precisely.
        var tokens = new Mock<ITokenService>();
        var counter = 0;
        tokens.SetupGet(t => t.RefreshTokenLifetime).Returns(TimeSpan.FromDays(7));
        tokens.Setup(t => t.CreateAccessToken(It.IsAny<User>()))
            .Returns<User>(user => new AccessToken($"access-{user.Email}", Start.AddMinutes(15)));
        tokens.Setup(t => t.GenerateRefreshToken()).Returns(() => $"refresh-{++counter}");
        tokens.Setup(t => t.HashRefreshToken(It.IsAny<string>())).Returns<string>(raw => $"hash({raw})");

        _sut = new AuthService(_db, new PasswordService(), tokens.Object, _clock);
    }

    [Fact]
    public async Task Register_StoresNormalizedEmailAndHashedPassword_AndReturnsTokens()
    {
        var response = await _sut.RegisterAsync(
            new RegisterRequest("  Alice@Example.COM ", "Password1", " Alice "), CancellationToken.None);

        Assert.Equal("access-alice@example.com", response.AccessToken);
        Assert.Equal("refresh-1", response.RefreshToken);
        Assert.Equal("Alice", response.User.DisplayName);

        var user = await _db.Users.SingleAsync();
        Assert.Equal("alice@example.com", user.Email);
        Assert.NotEqual("Password1", user.PasswordHash);

        // Only the hash of the refresh token is stored, never the raw value.
        var stored = await _db.RefreshTokens.SingleAsync();
        Assert.Equal("hash(refresh-1)", stored.TokenHash);
    }

    [Fact]
    public async Task Register_WithExistingEmail_IgnoresCaseAndThrowsConflict()
    {
        await _sut.RegisterAsync(new RegisterRequest("alice@example.com", "Password1", "Alice"), CancellationToken.None);

        await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.RegisterAsync(new RegisterRequest("ALICE@example.com", "Password1", "Other"), CancellationToken.None));
    }

    [Fact]
    public async Task Login_WithCorrectPassword_ReturnsTokens()
    {
        await _sut.RegisterAsync(new RegisterRequest("alice@example.com", "Password1", "Alice"), CancellationToken.None);

        var response = await _sut.LoginAsync(new LoginRequest("Alice@example.com", "Password1"), CancellationToken.None);

        Assert.Equal("alice@example.com", response.User.Email);
        Assert.Equal("refresh-2", response.RefreshToken);
    }

    [Theory]
    [InlineData("alice@example.com", "WrongPassword1")]
    [InlineData("nobody@example.com", "Password1")]
    public async Task Login_WithBadCredentials_ThrowsTheSameError(string email, string password)
    {
        await _sut.RegisterAsync(new RegisterRequest("alice@example.com", "Password1", "Alice"), CancellationToken.None);

        var error = await Assert.ThrowsAsync<AuthenticationFailedException>(() =>
            _sut.LoginAsync(new LoginRequest(email, password), CancellationToken.None));

        Assert.Equal("Invalid email or password.", error.Message);
    }

    [Fact]
    public async Task Refresh_RotatesTheToken_AndLinksOldToNew()
    {
        var first = await _sut.RegisterAsync(new RegisterRequest("alice@example.com", "Password1", "Alice"), CancellationToken.None);

        var second = await _sut.RefreshAsync(new RefreshRequest(first.RefreshToken), CancellationToken.None);

        Assert.NotEqual(first.RefreshToken, second.RefreshToken);

        var old = await _db.RefreshTokens.SingleAsync(t => t.TokenHash == "hash(refresh-1)");
        Assert.NotNull(old.RevokedAt);
        Assert.Equal("hash(refresh-2)", old.ReplacedByTokenHash);

        var current = await _db.RefreshTokens.SingleAsync(t => t.TokenHash == "hash(refresh-2)");
        Assert.Null(current.RevokedAt);
    }

    [Fact]
    public async Task Refresh_WithAlreadyRotatedToken_RevokesEveryActiveSession()
    {
        var first = await _sut.RegisterAsync(new RegisterRequest("alice@example.com", "Password1", "Alice"), CancellationToken.None);
        var second = await _sut.RefreshAsync(new RefreshRequest(first.RefreshToken), CancellationToken.None);

        // Replaying the first token looks like theft, so the legitimate second token must die as well.
        await Assert.ThrowsAsync<AuthenticationFailedException>(() =>
            _sut.RefreshAsync(new RefreshRequest(first.RefreshToken), CancellationToken.None));

        await Assert.ThrowsAsync<AuthenticationFailedException>(() =>
            _sut.RefreshAsync(new RefreshRequest(second.RefreshToken), CancellationToken.None));
    }

    [Fact]
    public async Task Refresh_WithExpiredToken_Throws()
    {
        var first = await _sut.RegisterAsync(new RegisterRequest("alice@example.com", "Password1", "Alice"), CancellationToken.None);

        _clock.Now = Start.AddDays(8);

        await Assert.ThrowsAsync<AuthenticationFailedException>(() =>
            _sut.RefreshAsync(new RefreshRequest(first.RefreshToken), CancellationToken.None));
    }

    [Fact]
    public async Task Refresh_WithUnknownToken_Throws()
    {
        await Assert.ThrowsAsync<AuthenticationFailedException>(() =>
            _sut.RefreshAsync(new RefreshRequest("not-a-real-token"), CancellationToken.None));
    }

    [Fact]
    public async Task Logout_RevokesTheToken_AndIsSafeToRepeat()
    {
        var session = await _sut.RegisterAsync(new RegisterRequest("alice@example.com", "Password1", "Alice"), CancellationToken.None);

        await _sut.LogoutAsync(new RefreshRequest(session.RefreshToken), CancellationToken.None);
        await _sut.LogoutAsync(new RefreshRequest(session.RefreshToken), CancellationToken.None);
        await _sut.LogoutAsync(new RefreshRequest("unknown"), CancellationToken.None);

        var stored = await _db.RefreshTokens.SingleAsync();
        Assert.NotNull(stored.RevokedAt);

        await Assert.ThrowsAsync<AuthenticationFailedException>(() =>
            _sut.RefreshAsync(new RefreshRequest(session.RefreshToken), CancellationToken.None));
    }

    [Fact]
    public async Task GetCurrentUser_ForMissingUser_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.GetCurrentUserAsync(Guid.NewGuid(), CancellationToken.None));
    }
}
