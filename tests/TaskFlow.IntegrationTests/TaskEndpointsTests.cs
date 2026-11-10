using System.Net;
using TaskFlow.Application.Common;
using TaskFlow.Application.Tasks;
using TaskFlow.Domain.Enums;

namespace TaskFlow.IntegrationTests;

public sealed class TaskEndpointsTests(TaskFlowFactory factory) : IClassFixture<TaskFlowFactory>
{
    [Fact]
    public async Task Create_StartsTheTaskAsTodo_AndReturnsCreated()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();

        var response = await user.Client.PostJsonAsync(
            $"/api/projects/{project.Id}/tasks",
            new CreateTaskRequest("Write the README", "Explain the architecture", TaskPriority.High, new DateOnly(2030, 1, 31)));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var task = await response.ReadAsAsync<TaskDto>();
        Assert.Equal(TaskItemStatus.Todo, task.Status);
        Assert.Equal(TaskPriority.High, task.Priority);
        Assert.Equal(new DateOnly(2030, 1, 31), task.DueDate);
        Assert.Equal(project.Id, task.ProjectId);
    }

    [Fact]
    public async Task Create_WithABlankTitle_Returns400()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();

        var response = await user.Client.PostJsonAsync(
            $"/api/projects/{project.Id}/tasks", new CreateTaskRequest("", null, TaskPriority.Low, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task List_FiltersSortsAndPages()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();
        await user.Client.CreateTaskAsync(project.Id, "Alpha", TaskPriority.Low);
        await user.Client.CreateTaskAsync(project.Id, "Bravo", TaskPriority.High);
        await user.Client.CreateTaskAsync(project.Id, "Charlie", TaskPriority.High);
        await user.Client.CreateTaskAsync(project.Id, "Delta", TaskPriority.Medium);

        var highPriority = await (await user.Client.GetAsync(
            $"/api/projects/{project.Id}/tasks?priority=High&sortBy=title&descending=false"))
            .ReadAsAsync<PagedResult<TaskDto>>();
        Assert.Equal(new[] { "Bravo", "Charlie" }, highPriority.Items.Select(t => t.Title).ToArray());

        var secondPage = await (await user.Client.GetAsync(
            $"/api/projects/{project.Id}/tasks?sortBy=title&descending=false&page=2&pageSize=3"))
            .ReadAsAsync<PagedResult<TaskDto>>();
        Assert.Equal(4, secondPage.TotalCount);
        Assert.Equal(2, secondPage.TotalPages);
        Assert.Equal(new[] { "Delta" }, secondPage.Items.Select(t => t.Title).ToArray());

        var searched = await (await user.Client.GetAsync($"/api/projects/{project.Id}/tasks?search=ALPH"))
            .ReadAsAsync<PagedResult<TaskDto>>();
        Assert.Equal("Alpha", Assert.Single(searched.Items).Title);
    }

    [Fact]
    public async Task List_WithAnUnknownSortField_Returns400()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();

        var response = await user.Client.GetAsync($"/api/projects/{project.Id}/tasks?sortBy=passwordHash");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task List_WithAnInvalidEnumValue_Returns400()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();

        var response = await user.Client.GetAsync($"/api/projects/{project.Id}/tasks?status=Archived");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateStatus_MovesTheTask()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();
        var task = await user.Client.CreateTaskAsync(project.Id);

        var response = await user.Client.PatchJsonAsync(
            $"/api/tasks/{task.Id}/status", new UpdateTaskStatusRequest(TaskItemStatus.InProgress));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(TaskItemStatus.InProgress, (await response.ReadAsAsync<TaskDto>()).Status);
    }

    [Fact]
    public async Task Update_ReplacesTheTaskFields()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();
        var task = await user.Client.CreateTaskAsync(project.Id, "Old title");

        var response = await user.Client.PutJsonAsync(
            $"/api/tasks/{task.Id}",
            new UpdateTaskRequest("New title", "More detail", TaskItemStatus.Done, TaskPriority.Low, null));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.ReadAsAsync<TaskDto>();
        Assert.Equal("New title", updated.Title);
        Assert.Equal(TaskItemStatus.Done, updated.Status);
    }

    [Fact]
    public async Task Delete_RemovesTheTask()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();
        var task = await user.Client.CreateTaskAsync(project.Id);

        Assert.Equal(HttpStatusCode.NoContent, (await user.Client.DeleteAsync($"/api/tasks/{task.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.GetAsync($"/api/tasks/{task.Id}")).StatusCode);
    }

    [Fact]
    public async Task Tasks_AreInvisibleToOtherUsers()
    {
        var alice = await factory.RegisterAsync();
        var bob = await factory.RegisterAsync();
        var project = await alice.Client.CreateProjectAsync();
        var task = await alice.Client.CreateTaskAsync(project.Id);

        Assert.Equal(HttpStatusCode.NotFound, (await bob.Client.GetAsync($"/api/tasks/{task.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.Client.GetAsync($"/api/projects/{project.Id}/tasks")).StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await bob.Client.PostJsonAsync(
                $"/api/projects/{project.Id}/tasks", new CreateTaskRequest("Sneaky", null, TaskPriority.Low, null))).StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await bob.Client.PatchJsonAsync(
                $"/api/tasks/{task.Id}/status", new UpdateTaskStatusRequest(TaskItemStatus.Done))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.Client.DeleteAsync($"/api/tasks/{task.Id}")).StatusCode);

        // Alice's task is untouched.
        var untouched = await (await alice.Client.GetAsync($"/api/tasks/{task.Id}")).ReadAsAsync<TaskDto>();
        Assert.Equal(TaskItemStatus.Todo, untouched.Status);
    }

    [Fact]
    public async Task Tasks_RequireAuthentication()
    {
        var response = await factory.CreateClient().GetAsync($"/api/tasks/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
