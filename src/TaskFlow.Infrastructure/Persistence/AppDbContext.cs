using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Project> Projects => Set<Project>();

    public DbSet<TaskItem> TaskItems => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(user =>
        {
            user.HasKey(u => u.Id);
            user.Property(u => u.Email).HasMaxLength(254).IsRequired();
            user.HasIndex(u => u.Email).IsUnique();
            user.Property(u => u.DisplayName).HasMaxLength(60).IsRequired();
            user.Property(u => u.PasswordHash).IsRequired();
            user.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<RefreshToken>(token =>
        {
            token.HasKey(t => t.Id);
            token.Property(t => t.TokenHash).HasMaxLength(128).IsRequired();
            token.HasIndex(t => t.TokenHash).IsUnique();
            token.Property(t => t.ReplacedByTokenHash).HasMaxLength(128);
            token.HasOne(t => t.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Project>(project =>
        {
            project.HasKey(p => p.Id);
            project.Property(p => p.Name).HasMaxLength(120).IsRequired();
            project.Property(p => p.Description).HasMaxLength(1000);
            project.HasIndex(p => p.OwnerId);
            project.HasOne(p => p.Owner)
                .WithMany(u => u.Projects)
                .HasForeignKey(p => p.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TaskItem>(task =>
        {
            task.HasKey(t => t.Id);
            task.Property(t => t.Title).HasMaxLength(200).IsRequired();
            task.Property(t => t.Description).HasMaxLength(4000);
            task.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            task.Property(t => t.Priority).HasConversion<string>().HasMaxLength(20);
            task.HasIndex(t => new { t.ProjectId, t.Status });
            task.HasOne(t => t.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
