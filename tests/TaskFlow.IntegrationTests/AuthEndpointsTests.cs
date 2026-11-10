using System.Net;
using System.Text.Json;
using TaskFlow.Application.Auth;
using TaskFlow.Domain.Enums;

namespace TaskFlow.IntegrationTests;

public sealed class AuthEndpointsTests(TaskFlowFactory factory) : IClassFixture<TaskFlowFactory>
{
    [Fact]
    public async Task Register_ReturnsTokensAndTheNewUser()
    {
        var client = factory.CreateClient();

        var response = await client.PostJsonAsync(
            "/api/auth/register", new RegisterRequest("Alice@Example.com", "Password1", "Alice"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.ReadAsAsync<AuthResponse>();
        Assert.False(string.IsNullOrWhiteSpace(auth.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(auth.RefreshToken));
        Assert.Equal("alice@example.com", auth.User.Email);
        Assert.Equal(UserRole.User, auth.User.Role);
    }

    [Fact]
    public async Task Register_WithAnEmailThatIsTaken_Returns409()
    {
        var client = factory.CreateClient();
        var email = $"taken-{Guid.NewGuid():N}@example.com";
        await client.PostJsonAsync("/api/auth/register", new RegisterRequest(email, "Password1", "First"));

        var response = await client.PostJsonAsync(
            "/api/auth/register", new RegisterRequest(email.ToUpperInvariant(), "Password1", "Second"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithInvalidInput_Returns400WithFieldErrors()
    {
        var client = factory.CreateClient();

        var response = await client.PostJsonAsync(
            "/api/auth/register", new RegisterRequest("not-an-email", "short", "A"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var errors = body.RootElement.GetProperty("errors");
        Assert.True(errors.TryGetProperty("email", out _));
        Assert.True(errors.TryGetProperty("password", out _));
        Assert.True(errors.TryGetProperty("displayName", out _));
    }

    [Fact]
    public async Task Login_WithTheWrongPassword_Returns401()
    {
        var user = await factory.RegisterAsync();

        var response = await factory.CreateClient().PostJsonAsync(
            "/api/auth/login", new LoginRequest(user.Auth.User.Email, "WrongPassword1"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsTokens()
    {
        var user = await factory.RegisterAsync();

        var response = await factory.CreateClient().PostJsonAsync(
            "/api/auth/login", new LoginRequest(user.Auth.User.Email, TestUsers.Password));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.ReadAsAsync<AuthResponse>();
        Assert.Equal(user.Auth.User.Id, auth.User.Id);
    }

    [Fact]
    public async Task Me_WithoutAToken_Returns401()
    {
        var response = await factory.CreateClient().GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithAValidToken_ReturnsTheCurrentUser()
    {
        var user = await factory.RegisterAsync();

        var response = await user.Client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = await response.ReadAsAsync<UserDto>();
        Assert.Equal(user.Auth.User.Email, me.Email);
    }

    [Fact]
    public async Task Me_WithAGarbageToken_Returns401()
    {
        var client = factory.CreateClient().WithToken("not.a.jwt");

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_RotatesTokens_AndAReplayedTokenEndsTheWholeSession()
    {
        var user = await factory.RegisterAsync();
        var client = factory.CreateClient();

        var rotated = await client.PostJsonAsync("/api/auth/refresh", new RefreshRequest(user.Auth.RefreshToken));
        Assert.Equal(HttpStatusCode.OK, rotated.StatusCode);
        var second = await rotated.ReadAsAsync<AuthResponse>();
        Assert.NotEqual(user.Auth.RefreshToken, second.RefreshToken);

        // Replaying the original token is treated as theft...
        var replay = await client.PostJsonAsync("/api/auth/refresh", new RefreshRequest(user.Auth.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);

        // ...so the newest token no longer works either.
        var afterReplay = await client.PostJsonAsync("/api/auth/refresh", new RefreshRequest(second.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, afterReplay.StatusCode);
    }

    [Fact]
    public async Task Logout_RevokesTheRefreshToken()
    {
        var user = await factory.RegisterAsync();
        var client = factory.CreateClient();

        var logout = await client.PostJsonAsync("/api/auth/logout", new RefreshRequest(user.Auth.RefreshToken));
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var refresh = await client.PostJsonAsync("/api/auth/refresh", new RefreshRequest(user.Auth.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }
}
