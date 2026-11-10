using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Admin;
using TaskFlow.Application.Common;

namespace TaskFlow.Api.Controllers;

/// <summary>Endpoints restricted to users in the Admin role (role-based authorization).</summary>
[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
public sealed class AdminController(IAdminService admin) : ControllerBase
{
    [HttpGet("users")]
    public async Task<ActionResult<PagedResult<AdminUserDto>>> Users(
        CancellationToken ct, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        Ok(await admin.ListUsersAsync(page, pageSize, ct));

    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> Stats(CancellationToken ct) =>
        Ok(await admin.GetStatsAsync(ct));
}
