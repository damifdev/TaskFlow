using System.Net;
using TaskFlow.Application.Admin;
using TaskFlow.Application.Common;

namespace TaskFlow.IntegrationTests;

public sealed class AdminEndpointsTests(TaskFlowFactory factory) : IClassFixture<TaskFlowFactory>
{
    [Fact]
    public async Task AdminEndpoints_RejectAnonymousCallers_With401()
    {
        var response = await factory.CreateClient().GetAsync("/api/admin/stats");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoints_RejectRegularUsers_With403()
    {
        var user = await factory.RegisterAsync();

        Assert.Equal(HttpStatusCode.Forbidden, (await user.Client.GetAsync("/api/admin/stats")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await user.Client.GetAsync("/api/admin/users")).StatusCode);
    }

    [Fact]
    public async Task Users_ListsRegisteredUsers_ForAnAdmin()
    {
        var user = await factory.RegisterAsync();
        var admin = await factory.CreateAdminClientAsync();

        var response = await admin.GetAsync("/api/admin/users?pageSize=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.ReadAsAsync<PagedResult<AdminUserDto>>();
        Assert.Contains(page.Items, u => u.Id == user.Auth.User.Id);
        Assert.True(page.TotalCount >= 2);
    }

    [Fact]
    public async Task Stats_CountsUsersProjectsAndTasks_ForAnAdmin()
    {
        var user = await factory.RegisterAsync();
        var project = await user.Client.CreateProjectAsync();
        await user.Client.CreateTaskAsync(project.Id);
        var admin = await factory.CreateAdminClientAsync();

        var stats = await (await admin.GetAsync("/api/admin/stats")).ReadAsAsync<AdminStatsDto>();

        Assert.True(stats.UserCount >= 2);
        Assert.True(stats.ProjectCount >= 1);
        Assert.True(stats.TaskCount >= 1);
        Assert.True(stats.TasksByStatus.ContainsKey("Todo"));
        Assert.True(stats.TasksByStatus.ContainsKey("InProgress"));
        Assert.True(stats.TasksByStatus.ContainsKey("Done"));
    }
}
