using TaskFlow.Application.Common;
using TaskFlow.Application.Projects;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Infrastructure.Persistence;

namespace TaskFlow.UnitTests;

public sealed class ProjectServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly AppDbContext _db = TestDb.Create();
    private readonly ProjectService _sut;

    public ProjectServiceTests()
    {
        _sut = new ProjectService(_db, new TestClock(Now));
    }

    [Fact]
    public async Task Create_TrimsName_AndTreatsBlankDescriptionAsNull()
    {
        var owner = await TestDb.AddUserAsync(_db);

        var project = await _sut.CreateAsync(
            owner.Id, new CreateProjectRequest("  Roadmap  ", "   "), CancellationToken.None);

        Assert.Equal("Roadmap", project.Name);
        Assert.Null(project.Description);
        Assert.Equal(0, project.TaskCount);
    }

    [Fact]
    public async Task List_ReturnsOnlyOwnProjects_WithTaskCounts()
    {
        var alice = await TestDb.AddUserAsync(_db, "alice@example.com");
        var bob = await TestDb.AddUserAsync(_db, "bob@example.com");
        var aliceProject = await TestDb.AddProjectAsync(_db, alice.Id, "Alice's");
        await TestDb.AddProjectAsync(_db, bob.Id, "Bob's");

        _db.TaskItems.AddRange(
            new TaskItem { ProjectId = aliceProject.Id, Title = "one", Status = TaskItemStatus.Done, CreatedAt = Now, UpdatedAt = Now },
            new TaskItem { ProjectId = aliceProject.Id, Title = "two", Status = TaskItemStatus.Todo, CreatedAt = Now, UpdatedAt = Now });
        await _db.SaveChangesAsync();

        var projects = await _sut.ListAsync(alice.Id, CancellationToken.None);

        var only = Assert.Single(projects);
        Assert.Equal("Alice's", only.Name);
        Assert.Equal(2, only.TaskCount);
        Assert.Equal(1, only.DoneCount);
    }

    [Fact]
    public async Task Get_ForAnotherUsersProject_ThrowsNotFound()
    {
        var alice = await TestDb.AddUserAsync(_db, "alice@example.com");
        var bob = await TestDb.AddUserAsync(_db, "bob@example.com");
        var project = await TestDb.AddProjectAsync(_db, alice.Id);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.GetAsync(bob.Id, project.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Update_ChangesNameAndDescription()
    {
        var owner = await TestDb.AddUserAsync(_db);
        var project = await TestDb.AddProjectAsync(_db, owner.Id, "Before");

        var updated = await _sut.UpdateAsync(
            owner.Id, project.Id, new UpdateProjectRequest("After", "Now with a description"), CancellationToken.None);

        Assert.Equal("After", updated.Name);
        Assert.Equal("Now with a description", updated.Description);
    }

    [Fact]
    public async Task Delete_RemovesTheProject()
    {
        var owner = await TestDb.AddUserAsync(_db);
        var project = await TestDb.AddProjectAsync(_db, owner.Id);

        await _sut.DeleteAsync(owner.Id, project.Id, CancellationToken.None);

        Assert.Empty(await _sut.ListAsync(owner.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Delete_ByAnotherUser_ThrowsNotFound()
    {
        var alice = await TestDb.AddUserAsync(_db, "alice@example.com");
        var bob = await TestDb.AddUserAsync(_db, "bob@example.com");
        var project = await TestDb.AddProjectAsync(_db, alice.Id);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.DeleteAsync(bob.Id, project.Id, CancellationToken.None));
    }
}
