using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;
using TaskFlow.Infrastructure.Persistence;

namespace TaskFlow.UnitTests;

internal static class TestDb
{
    /// <summary>A fresh, isolated in-memory database for each test.</summary>
    public static AppDbContext Create() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    public static async Task<User> AddUserAsync(AppDbContext db, string email = "owner@example.com")
    {
        var user = new User { Email = email, DisplayName = "Owner", PasswordHash = "hash", CreatedAt = DateTimeOffset.UtcNow };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public static async Task<Project> AddProjectAsync(AppDbContext db, Guid ownerId, string name = "Project")
    {
        var project = new Project
        {
            OwnerId = ownerId,
            Name = name,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return project;
    }
}

/// <summary>A clock the test can move forward, so token expiry can be tested without sleeping.</summary>
internal sealed class TestClock(DateTimeOffset start) : TimeProvider
{
    public DateTimeOffset Now { get; set; } = start;

    public override DateTimeOffset GetUtcNow() => Now;
}
