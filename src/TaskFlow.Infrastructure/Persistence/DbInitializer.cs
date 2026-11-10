using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Infrastructure.Persistence;

public static class DbInitializer
{
    public const string DemoEmail = "demo@taskflow.dev";
    public const string AdminEmail = "admin@taskflow.dev";

    /// <summary>
    /// Prepares the database on startup. If EF migrations exist they are applied; otherwise the schema is
    /// created straight from the model, which keeps a fresh clone runnable before the first migration is added.
    /// </summary>
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;

        var db = provider.GetRequiredService<AppDbContext>();
        var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger("TaskFlow.DbInitializer");

        if (db.Database.IsRelational() && db.Database.GetMigrations().Any())
        {
            logger.LogInformation("Applying database migrations");
            await db.Database.MigrateAsync(ct);
        }
        else
        {
            logger.LogInformation("No migrations found, creating the schema from the model");
            await db.Database.EnsureCreatedAsync(ct);
        }

        var seed = provider.GetRequiredService<IOptions<SeedOptions>>().Value;
        if (seed.Enabled)
        {
            await SeedAsync(
                db,
                provider.GetRequiredService<IPasswordService>(),
                provider.GetRequiredService<TimeProvider>(),
                seed,
                ct);
            logger.LogInformation("Demo data is available ({DemoEmail})", DemoEmail);
        }
    }

    private static async Task SeedAsync(
        AppDbContext db, IPasswordService passwords, TimeProvider clock, SeedOptions seed, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);

        if (!string.IsNullOrWhiteSpace(seed.AdminPassword) &&
            !await db.Users.AnyAsync(u => u.Email == AdminEmail, ct))
        {
            db.Users.Add(new User
            {
                Email = AdminEmail,
                DisplayName = "Admin",
                PasswordHash = passwords.Hash(seed.AdminPassword),
                Role = UserRole.Admin,
                CreatedAt = now
            });
        }

        if (!await db.Users.AnyAsync(u => u.Email == DemoEmail, ct))
        {
            var demo = new User
            {
                Email = DemoEmail,
                DisplayName = "Demo User",
                PasswordHash = passwords.Hash(seed.DemoPassword),
                Role = UserRole.User,
                CreatedAt = now
            };

            demo.Projects.Add(new Project
            {
                Name = "Website redesign",
                Description = "Refresh the marketing site ahead of the spring launch.",
                CreatedAt = now.AddDays(-14),
                UpdatedAt = now.AddDays(-14),
                Tasks =
                [
                    NewTask("Audit current navigation", TaskItemStatus.Done, TaskPriority.Medium, today.AddDays(-9), now),
                    NewTask("Draft new homepage wireframes", TaskItemStatus.Done, TaskPriority.High, today.AddDays(-5), now),
                    NewTask("Build the pricing page", TaskItemStatus.InProgress, TaskPriority.High, today.AddDays(3), now),
                    NewTask("Write launch announcement", TaskItemStatus.Todo, TaskPriority.Medium, today.AddDays(10), now),
                    NewTask("Accessibility review", TaskItemStatus.Todo, TaskPriority.Low, null, now)
                ]
            });

            demo.Projects.Add(new Project
            {
                Name = "Mobile app v2",
                Description = "Scope and ship the second major release of the mobile app.",
                CreatedAt = now.AddDays(-7),
                UpdatedAt = now.AddDays(-7),
                Tasks =
                [
                    NewTask("Collect user feedback", TaskItemStatus.Done, TaskPriority.Medium, today.AddDays(-2), now),
                    NewTask("Fix offline sync bug", TaskItemStatus.InProgress, TaskPriority.High, today.AddDays(-1), now),
                    NewTask("Design onboarding flow", TaskItemStatus.Todo, TaskPriority.Medium, today.AddDays(14), now)
                ]
            });

            db.Users.Add(demo);
        }

        await db.SaveChangesAsync(ct);
    }

    private static TaskItem NewTask(
        string title, TaskItemStatus status, TaskPriority priority, DateOnly? dueDate, DateTimeOffset now) => new()
    {
        Title = title,
        Status = status,
        Priority = priority,
        DueDate = dueDate,
        CreatedAt = now,
        UpdatedAt = now
    };
}
