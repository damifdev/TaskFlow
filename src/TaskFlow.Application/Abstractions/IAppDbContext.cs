using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Abstractions;

/// <summary>
/// The slice of the EF Core context the application layer needs. Keeping it as an interface lets the
/// services be tested against any EF provider and keeps the Application project free of Npgsql.
/// </summary>
public interface IAppDbContext
{
    DbSet<User> Users { get; }

    DbSet<RefreshToken> RefreshTokens { get; }

    DbSet<Project> Projects { get; }

    DbSet<TaskItem> TaskItems { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
