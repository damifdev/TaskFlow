using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Auth;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Infrastructure.Persistence;

namespace TaskFlow.IntegrationTests;

/// <summary>
/// Boots the real API in memory (routing, auth, validation, exception handling) and swaps PostgreSQL for the
/// EF Core in-memory provider, so the tests run anywhere without Docker.
/// </summary>
public sealed class TaskFlowFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "integration-test-signing-key-at-least-32-characters-long",
                ["ConnectionStrings:Default"] = "Host=unused",
                // Tests register dozens of users from one IP, so lift the auth rate limit.
                ["RateLimiting:AuthPermitLimit"] = "100000",
                ["Seed:Enabled"] = "false"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // Remove everything AddDbContext registered for AppDbContext (options and their configuration),
            // otherwise EF Core would see two database providers.
            var registrations = services
                .Where(d => d.ServiceType.IsGenericType && d.ServiceType.GenericTypeArguments.Contains(typeof(AppDbContext)))
                .ToList();

            foreach (var registration in registrations)
            {
                services.Remove(registration);
            }

            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName));
        });
    }

    /// <summary>Inserts an admin straight into the database (there is no public way to become one) and signs in.</summary>
    public async Task<HttpClient> CreateAdminClientAsync()
    {
        var email = $"admin-{Guid.NewGuid():N}@example.com";

        using (var scope = Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var passwords = scope.ServiceProvider.GetRequiredService<IPasswordService>();

            db.Users.Add(new User
            {
                Email = email,
                DisplayName = "Admin",
                PasswordHash = passwords.Hash(TestUsers.Password),
                Role = UserRole.Admin,
                CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var client = CreateClient();
        var response = await client.PostJsonAsync("/api/auth/login", new LoginRequest(email, TestUsers.Password));
        response.EnsureSuccessStatusCode();

        var auth = await response.ReadAsAsync<AuthResponse>();
        return client.WithToken(auth.AccessToken);
    }
}
