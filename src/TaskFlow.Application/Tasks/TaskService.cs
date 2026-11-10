using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Common;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Tasks;

public interface ITaskService
{
    Task<PagedResult<TaskDto>> ListAsync(Guid userId, Guid projectId, TaskQuery query, CancellationToken ct);

    Task<TaskDto> GetAsync(Guid userId, Guid taskId, CancellationToken ct);

    Task<TaskDto> CreateAsync(Guid userId, Guid projectId, CreateTaskRequest request, CancellationToken ct);

    Task<TaskDto> UpdateAsync(Guid userId, Guid taskId, UpdateTaskRequest request, CancellationToken ct);

    Task<TaskDto> UpdateStatusAsync(Guid userId, Guid taskId, UpdateTaskStatusRequest request, CancellationToken ct);

    Task DeleteAsync(Guid userId, Guid taskId, CancellationToken ct);
}

public sealed class TaskService(IAppDbContext db, TimeProvider clock) : ITaskService
{
    public async Task<PagedResult<TaskDto>> ListAsync(
        Guid userId, Guid projectId, TaskQuery query, CancellationToken ct)
    {
        await EnsureProjectOwnedAsync(userId, projectId, ct);

        var tasks = db.TaskItems.AsNoTracking().Where(t => t.ProjectId == projectId);

        if (query.Status is { } status)
        {
            tasks = tasks.Where(t => t.Status == status);
        }

        if (query.Priority is { } priority)
        {
            tasks = tasks.Where(t => t.Priority == priority);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            tasks = tasks.Where(t =>
                t.Title.ToLower().Contains(term) ||
                (t.Description != null && t.Description.ToLower().Contains(term)));
        }

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var totalCount = await tasks.CountAsync(ct);
        var items = await ApplySort(tasks, query)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(TaskMappings.ToDtoExpression)
            .ToListAsync(ct);

        return new PagedResult<TaskDto>(items, page, pageSize, totalCount);
    }

    public async Task<TaskDto> GetAsync(Guid userId, Guid taskId, CancellationToken ct) =>
        await db.TaskItems
            .AsNoTracking()
            .Where(t => t.Id == taskId && t.Project.OwnerId == userId)
            .Select(TaskMappings.ToDtoExpression)
            .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Task not found.");

    public async Task<TaskDto> CreateAsync(
        Guid userId, Guid projectId, CreateTaskRequest request, CancellationToken ct)
    {
        await EnsureProjectOwnedAsync(userId, projectId, ct);

        var now = clock.GetUtcNow();
        var task = new TaskItem
        {
            ProjectId = projectId,
            Title = request.Title.Trim(),
            Description = TextHelpers.NullIfBlank(request.Description),
            Status = TaskItemStatus.Todo,
            Priority = request.Priority,
            DueDate = request.DueDate,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.TaskItems.Add(task);
        await db.SaveChangesAsync(ct);

        return task.ToDto();
    }

    public async Task<TaskDto> UpdateAsync(
        Guid userId, Guid taskId, UpdateTaskRequest request, CancellationToken ct)
    {
        var task = await FindOwnedAsync(userId, taskId, ct);

        task.Title = request.Title.Trim();
        task.Description = TextHelpers.NullIfBlank(request.Description);
        task.Status = request.Status;
        task.Priority = request.Priority;
        task.DueDate = request.DueDate;
        task.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);

        return task.ToDto();
    }

    public async Task<TaskDto> UpdateStatusAsync(
        Guid userId, Guid taskId, UpdateTaskStatusRequest request, CancellationToken ct)
    {
        var task = await FindOwnedAsync(userId, taskId, ct);

        task.Status = request.Status;
        task.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);

        return task.ToDto();
    }

    public async Task DeleteAsync(Guid userId, Guid taskId, CancellationToken ct)
    {
        var task = await FindOwnedAsync(userId, taskId, ct);

        db.TaskItems.Remove(task);
        await db.SaveChangesAsync(ct);
    }

    private async Task EnsureProjectOwnedAsync(Guid userId, Guid projectId, CancellationToken ct)
    {
        var owned = await db.Projects.AnyAsync(p => p.Id == projectId && p.OwnerId == userId, ct);
        if (!owned)
        {
            throw new NotFoundException("Project not found.");
        }
    }

    // Ownership is checked through the task's project, so other users' tasks look like missing ones.
    private async Task<TaskItem> FindOwnedAsync(Guid userId, Guid taskId, CancellationToken ct) =>
        await db.TaskItems.FirstOrDefaultAsync(t => t.Id == taskId && t.Project.OwnerId == userId, ct)
        ?? throw new NotFoundException("Task not found.");

    private static IQueryable<TaskItem> ApplySort(IQueryable<TaskItem> tasks, TaskQuery query)
    {
        var descending = query.Descending;

        IOrderedQueryable<TaskItem> ordered = query.SortBy.ToLowerInvariant() switch
        {
            "title" => descending
                ? tasks.OrderByDescending(t => t.Title)
                : tasks.OrderBy(t => t.Title),

            // Tasks without a due date always sort last, in both directions.
            "duedate" => descending
                ? tasks.OrderBy(t => t.DueDate == null).ThenByDescending(t => t.DueDate)
                : tasks.OrderBy(t => t.DueDate == null).ThenBy(t => t.DueDate),

            // Priority is stored as text, so rank it explicitly instead of sorting alphabetically.
            "priority" => descending
                ? tasks.OrderByDescending(t => t.Priority == TaskPriority.High ? 3 : t.Priority == TaskPriority.Medium ? 2 : 1)
                : tasks.OrderBy(t => t.Priority == TaskPriority.High ? 3 : t.Priority == TaskPriority.Medium ? 2 : 1),

            _ => descending
                ? tasks.OrderByDescending(t => t.CreatedAt)
                : tasks.OrderBy(t => t.CreatedAt)
        };

        // Id as a final tiebreaker keeps pages stable when many rows share the same sort value.
        return ordered.ThenBy(t => t.Id);
    }
}
