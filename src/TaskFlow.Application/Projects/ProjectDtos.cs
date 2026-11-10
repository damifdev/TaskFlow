namespace TaskFlow.Application.Projects;

public sealed record ProjectDto(
    Guid Id,
    string Name,
    string? Description,
    DateTimeOffset CreatedAt,
    int TaskCount,
    int DoneCount);

public sealed record CreateProjectRequest(string Name, string? Description);

public sealed record UpdateProjectRequest(string Name, string? Description);
