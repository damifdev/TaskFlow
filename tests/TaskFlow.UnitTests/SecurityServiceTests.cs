using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Infrastructure.Security;

namespace TaskFlow.UnitTests;

public sealed class SecurityServiceTests
{
    private const string SigningKey = "unit-test-signing-key-that-is-long-enough-123456";

    private static TokenService CreateTokenService(string key = SigningKey) =>
        new(Options.Create(new JwtOptions { Key = key, AccessTokenMinutes = 15 }), TimeProvider.System);

    private static User CreateUser(UserRole role = UserRole.User) => new()
    {
        Email = "alice@example.com",
        DisplayName = "Alice",
        Role = role
    };

    [Fact]
    public void AccessToken_CarriesIdentityAndRoleClaims()
    {
        var user = CreateUser(UserRole.Admin);

        var token = CreateTokenService().CreateAccessToken(user);
        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(token.Value);

        Assert.Equal(user.Id.ToString(), jwt.Subject);
        Assert.Equal("alice@example.com", jwt.GetClaim("email").Value);
        Assert.Equal("Alice", jwt.GetClaim("name").Value);
        Assert.Equal("Admin", jwt.GetClaim("role").Value);
        Assert.Equal("TaskFlow", jwt.Issuer);
    }

    [Fact]
    public void AccessToken_ExpiresAfterTheConfiguredLifetime()
    {
        var before = DateTimeOffset.UtcNow;

        var token = CreateTokenService().CreateAccessToken(CreateUser());

        Assert.InRange(token.ExpiresAt, before.AddMinutes(15), before.AddMinutes(15).AddSeconds(5));
    }

    [Fact]
    public async Task AccessToken_IsAcceptedWithTheRightKey_AndRejectedWithAnother()
    {
        var token = CreateTokenService().CreateAccessToken(CreateUser());
        var handler = new JsonWebTokenHandler();

        TokenValidationParameters Parameters(string key) => new()
        {
            ValidIssuer = "TaskFlow",
            ValidAudience = "TaskFlow.Client",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
        };

        var accepted = await handler.ValidateTokenAsync(token.Value, Parameters(SigningKey));
        var rejected = await handler.ValidateTokenAsync(token.Value, Parameters("a-completely-different-signing-key-987654321"));

        Assert.True(accepted.IsValid);
        Assert.False(rejected.IsValid);
    }

    [Fact]
    public void RefreshTokens_AreUnique_AndLongEnoughToBeUnguessable()
    {
        var service = CreateTokenService();

        var first = service.GenerateRefreshToken();
        var second = service.GenerateRefreshToken();

        Assert.NotEqual(first, second);
        Assert.True(first.Length >= 80);
    }

    [Fact]
    public void RefreshTokenHash_IsDeterministic_AndDoesNotExposeTheToken()
    {
        var service = CreateTokenService();

        var hash = service.HashRefreshToken("some-token");

        Assert.Equal(hash, service.HashRefreshToken("some-token"));
        Assert.NotEqual(hash, service.HashRefreshToken("another-token"));
        Assert.DoesNotContain("some-token", hash);
    }

    [Fact]
    public void Passwords_AreSalted_AndVerifiedCorrectly()
    {
        var service = new PasswordService();

        var first = service.Hash("Password1");
        var second = service.Hash("Password1");

        Assert.NotEqual(first, second);
        Assert.True(service.Verify(first, "Password1"));
        Assert.False(service.Verify(first, "password1"));
    }
}
