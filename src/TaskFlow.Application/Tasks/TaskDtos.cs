using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Tasks;

public sealed record TaskDto(
    Guid Id,
    Guid ProjectId,
    string Title,
    string? Description,
    TaskItemStatus Status,
    TaskPriority Priority,
    DateOnly? DueDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateTaskRequest(string Title, string? Description, TaskPriority Priority, DateOnly? DueDate);

public sealed record UpdateTaskRequest(
    string Title,
    string? Description,
    TaskItemStatus Status,
    TaskPriority Priority,
    DateOnly? DueDate);

public sealed record UpdateTaskStatusRequest(TaskItemStatus Status);

/// <summary>Query-string filters for listing a project's tasks. A class (not a record) so MVC applies the defaults.</summary>
public sealed class TaskQuery
{
    public TaskItemStatus? Status { get; set; }

    public TaskPriority? Priority { get; set; }

    public string? Search { get; set; }

    /// <summary>One of createdAt, dueDate, priority, title (case-insensitive).</summary>
    public string SortBy { get; set; } = "createdAt";

    public bool Descending { get; set; } = true;

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;
}
