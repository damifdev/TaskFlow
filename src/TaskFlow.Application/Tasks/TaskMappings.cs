using System.Linq.Expressions;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Tasks;

internal static class TaskMappings
{
    /// <summary>Used inside EF queries so only the needed columns are selected.</summary>
    public static readonly Expression<Func<TaskItem, TaskDto>> ToDtoExpression = t => new TaskDto(
        t.Id,
        t.ProjectId,
        t.Title,
        t.Description,
        t.Status,
        t.Priority,
        t.DueDate,
        t.CreatedAt,
        t.UpdatedAt);

    // Compiled from the same expression so the in-memory and SQL mappings can never drift apart.
    private static readonly Func<TaskItem, TaskDto> Compiled = ToDtoExpression.Compile();

    public static TaskDto ToDto(this TaskItem task) => Compiled(task);
}
