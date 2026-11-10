using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Common;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Projects;

public interface IProjectService
{
    Task<IReadOnlyList<ProjectDto>> ListAsync(Guid userId, CancellationToken ct);

    Task<ProjectDto> GetAsync(Guid userId, Guid projectId, CancellationToken ct);

    Task<ProjectDto> CreateAsync(Guid userId, CreateProjectRequest request, CancellationToken ct);

    Task<ProjectDto> UpdateAsync(Guid userId, Guid projectId, UpdateProjectRequest request, CancellationToken ct);

    Task DeleteAsync(Guid userId, Guid projectId, CancellationToken ct);
}

public sealed class ProjectService(IAppDbContext db, TimeProvider clock) : IProjectService
{
    // An expression (not a method) so EF Core translates the task counts into SQL instead of loading tasks.
    private static readonly Expression<Func<Project, ProjectDto>> ToDtoExpression = p => new ProjectDto(
        p.Id,
        p.Name,
        p.Description,
        p.CreatedAt,
        p.Tasks.Count(),
        p.Tasks.Count(t => t.Status == TaskItemStatus.Done));

    public async Task<IReadOnlyList<ProjectDto>> ListAsync(Guid userId, CancellationToken ct) =>
        await db.Projects
            .AsNoTracking()
            .Where(p => p.OwnerId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(ToDtoExpression)
            .ToListAsync(ct);

    public async Task<ProjectDto> GetAsync(Guid userId, Guid projectId, CancellationToken ct) =>
        await db.Projects
            .AsNoTracking()
            .Where(p => p.OwnerId == userId && p.Id == projectId)
            .Select(ToDtoExpression)
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Project not found.");

    public async Task<ProjectDto> CreateAsync(Guid userId, CreateProjectRequest request, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var project = new Project
        {
            OwnerId = userId,
            Name = request.Name.Trim(),
            Description = TextHelpers.NullIfBlank(request.Description),
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync(ct);

        return new ProjectDto(project.Id, project.Name, project.Description, project.CreatedAt, 0, 0);
    }

    public async Task<ProjectDto> UpdateAsync(
        Guid userId, Guid projectId, UpdateProjectRequest request, CancellationToken ct)
    {
        var project = await FindOwnedAsync(userId, projectId, ct);

        project.Name = request.Name.Trim();
        project.Description = TextHelpers.NullIfBlank(request.Description);
        project.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);

        return await GetAsync(userId, projectId, ct);
    }

    public async Task DeleteAsync(Guid userId, Guid projectId, CancellationToken ct)
    {
        var project = await FindOwnedAsync(userId, projectId, ct);

        // Tasks are removed by the cascade delete configured in AppDbContext.
        db.Projects.Remove(project);
        await db.SaveChangesAsync(ct);
    }

    // Ownership is part of the lookup, so another user's project is indistinguishable from a missing one.
    private async Task<Project> FindOwnedAsync(Guid userId, Guid projectId, CancellationToken ct) =>
        await db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && p.OwnerId == userId, ct)
        ?? throw new NotFoundException("Project not found.");
}
