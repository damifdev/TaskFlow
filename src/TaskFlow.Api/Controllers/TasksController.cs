using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Api.Extensions;
using TaskFlow.Application.Common;
using TaskFlow.Application.Tasks;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
public sealed class TasksController(ITaskService tasks) : ControllerBase
{
    /// <summary>Lists a project's tasks with filtering, sorting and paging.</summary>
    [HttpGet("projects/{projectId:guid}/tasks")]
    public async Task<ActionResult<PagedResult<TaskDto>>> List(
        Guid projectId, [FromQuery] TaskQuery query, CancellationToken ct) =>
        Ok(await tasks.ListAsync(User.GetUserId(), projectId, query, ct));

    [HttpPost("projects/{projectId:guid}/tasks")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TaskDto>> Create(Guid projectId, CreateTaskRequest request, CancellationToken ct)
    {
        var task = await tasks.CreateAsync(User.GetUserId(), projectId, request, ct);
        return CreatedAtAction(nameof(Get), new { id = task.Id }, task);
    }

    [HttpGet("tasks/{id:guid}")]
    public async Task<ActionResult<TaskDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await tasks.GetAsync(User.GetUserId(), id, ct));

    [HttpPut("tasks/{id:guid}")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TaskDto>> Update(Guid id, UpdateTaskRequest request, CancellationToken ct) =>
        Ok(await tasks.UpdateAsync(User.GetUserId(), id, request, ct));

    [HttpPatch("tasks/{id:guid}/status")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TaskDto>> UpdateStatus(
        Guid id, UpdateTaskStatusRequest request, CancellationToken ct) =>
        Ok(await tasks.UpdateStatusAsync(User.GetUserId(), id, request, ct));

    [HttpDelete("tasks/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await tasks.DeleteAsync(User.GetUserId(), id, ct);
        return NoContent();
    }
}
