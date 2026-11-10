using System.Net;
using TaskFlow.Application.Projects;
using TaskFlow.Application.Tasks;
using TaskFlow.Domain.Enums;

namespace TaskFlow.IntegrationTests;

public sealed class ProjectEndpointsTests(TaskFlowFactory factory) : IClassFixture<TaskFlowFactory>
{
    [Fact]
    public async Task Projects_RequireAuthentication()
    {
        var response = await factory.CreateClient().GetAsync("/api/projects");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_ReturnsCreated_AndTheProjectAppearsInTheList()
    {
        var user = await factory.RegisterAsync();

        var created = await user.Client.PostJsonAsync("/api/projects", new CreateProjectRequest("Launch plan", "Q3"));

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.NotNull(created.Headers.Location);
        var project = await created.ReadAsAsync<ProjectDto>();

        var list = await (await user.Client.GetAsync("/api/projects")).ReadAsAsync<List<ProjectDto>>();
        var listed = Assert.Single(list);
        Assert.Equal(project.Id, listed.Id);
        Assert.Equal("Launch plan", listed.Name);
    }

    [Fact]
    public async Task Create_WithABlankName_Returns400()
    {
        var user = await factory.RegisterAsync();

        var response = await user.Client.PostJsonAsync("/api/projects", new CreateProjectRequest("   ", null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Projects_AreInvisibleToOtherUsers()
    {
        var alice = await factory.RegisterAsync();
        var bob = await factory.RegisterAsync();
        var project = await alice.Client.CreateProjectAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await bob.Client.GetAsync($"/api/projects/{project.Id}")).StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await bob.Client.PutJsonAsync($"/api/projects/{project.Id}", new UpdateProjectRequest("Hijacked", null))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.Client.DeleteAsync($"/api/projects/{project.Id}")).StatusCode);

        var bobsList = await (await bob.Client.GetAsync("/api/projects")).ReadAsAsync<List<ProjectDto>>();
        Assert.Empty(bobsList);
    }

    [Fact]
    public async Task Update_ChangesTheProject()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync("Before");

        var response = await user.Client.PutJsonAsync(
            $"/api/projects/{project.Id}", new UpdateProjectRequest("After", "Details"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.ReadAsAsync<ProjectDto>();
        Assert.Equal("After", updated.Name);
        Assert.Equal("Details", updated.Description);
    }

    [Fact]
    public async Task Delete_RemovesTheProjectAndItsTasks()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();
        var task = await user.Client.CreateTaskAsync(project.Id);

        var delete = await user.Client.DeleteAsync($"/api/projects/{project.Id}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.GetAsync($"/api/projects/{project.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.GetAsync($"/api/tasks/{task.Id}")).StatusCode);
    }

    [Fact]
    public async Task Project_ReportsTaskProgress()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();
        var first = await user.Client.CreateTaskAsync(project.Id, "One");
        await user.Client.CreateTaskAsync(project.Id, "Two");

        await user.Client.PatchJsonAsync(
            $"/api/tasks/{first.Id}/status", new UpdateTaskStatusRequest(TaskItemStatus.Done));

        var refreshed = await (await user.Client.GetAsync($"/api/projects/{project.Id}")).ReadAsAsync<ProjectDto>();
        Assert.Equal(2, refreshed.TaskCount);
        Assert.Equal(1, refreshed.DoneCount);
    }
}
