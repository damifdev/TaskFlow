using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Common;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Admin;

public interface IAdminService
{
    Task<PagedResult<AdminUserDto>> ListUsersAsync(int page, int pageSize, CancellationToken ct);

    Task<AdminStatsDto> GetStatsAsync(CancellationToken ct);
}

public sealed class AdminService(IAppDbContext db) : IAdminService
{
    public async Task<PagedResult<AdminUserDto>> ListUsersAsync(int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var totalCount = await db.Users.CountAsync(ct);
        var items = await db.Users
            .AsNoTracking()
            .OrderBy(u => u.CreatedAt)
            .ThenBy(u => u.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserDto(u.Id, u.Email, u.DisplayName, u.Role, u.CreatedAt, u.Projects.Count()))
            .ToListAsync(ct);

        return new PagedResult<AdminUserDto>(items, page, pageSize, totalCount);
    }

    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken ct)
    {
        var userCount = await db.Users.CountAsync(ct);
        var projectCount = await db.Projects.CountAsync(ct);
        var taskCount = await db.TaskItems.CountAsync(ct);

        var grouped = await db.TaskItems
            .GroupBy(t => t.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        // Report every status, including the ones nobody is using yet.
        var byStatus = Enum.GetValues<TaskItemStatus>()
            .ToDictionary(
                status => status.ToString(),
                status => grouped.FirstOrDefault(g => g.Status == status)?.Count ?? 0);

        return new AdminStatsDto(userCount, projectCount, taskCount, byStatus);
    }
}
