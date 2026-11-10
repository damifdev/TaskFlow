using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Admin;

public sealed record AdminUserDto(
    Guid Id,
    string Email,
    string DisplayName,
    UserRole Role,
    DateTimeOffset CreatedAt,
    int ProjectCount);

public sealed record AdminStatsDto(
    int UserCount,
    int ProjectCount,
    int TaskCount,
    Dictionary<string, int> TasksByStatus);
