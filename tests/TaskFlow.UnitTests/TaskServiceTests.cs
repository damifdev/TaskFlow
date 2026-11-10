using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common;
using TaskFlow.Application.Tasks;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Infrastructure.Persistence;

namespace TaskFlow.UnitTests;

public sealed class TaskServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly AppDbContext _db = TestDb.Create();
    private readonly TaskService _sut;

    public TaskServiceTests()
    {
        _sut = new TaskService(_db, new TestClock(Now));
    }

    private async Task<(User Owner, Project Project)> SeedProjectAsync()
    {
        var owner = await TestDb.AddUserAsync(_db);
        var project = await TestDb.AddProjectAsync(_db, owner.Id);
        return (owner, project);
    }

    private async Task AddTaskAsync(
        Guid projectId,
        string title,
        TaskItemStatus status = TaskItemStatus.Todo,
        TaskPriority priority = TaskPriority.Medium,
        DateOnly? due = null,
        string? description = null,
        int createdMinutesAgo = 0)
    {
        _db.TaskItems.Add(new TaskItem
        {
            ProjectId = projectId,
            Title = title,
            Description = description,
            Status = status,
            Priority = priority,
            DueDate = due,
            CreatedAt = Now.AddMinutes(-createdMinutesAgo),
            UpdatedAt = Now
        });
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task Create_TrimsInput_AndStartsAsTodo()
    {
        var (owner, project) = await SeedProjectAsync();

        var task = await _sut.CreateAsync(
            owner.Id,
            project.Id,
            new CreateTaskRequest("  Write docs  ", "   ", TaskPriority.High, new DateOnly(2026, 4, 1)),
            CancellationToken.None);

        Assert.Equal("Write docs", task.Title);
        Assert.Null(task.Description);
        Assert.Equal(TaskItemStatus.Todo, task.Status);
        Assert.Equal(TaskPriority.High, task.Priority);
        Assert.Equal(Now, task.CreatedAt);
    }

    [Fact]
    public async Task Create_InAnotherUsersProject_ThrowsNotFound()
    {
        var (_, project) = await SeedProjectAsync();
        var intruder = await TestDb.AddUserAsync(_db, "intruder@example.com");

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.CreateAsync(
            intruder.Id,
            project.Id,
            new CreateTaskRequest("Sneaky", null, TaskPriority.Low, null),
            CancellationToken.None));
    }

    [Fact]
    public async Task List_FiltersByStatusAndPriority()
    {
        var (owner, project) = await SeedProjectAsync();
        await AddTaskAsync(project.Id, "A", TaskItemStatus.Todo, TaskPriority.High);
        await AddTaskAsync(project.Id, "B", TaskItemStatus.Done, TaskPriority.High);
        await AddTaskAsync(project.Id, "C", TaskItemStatus.Done, TaskPriority.Low);

        var result = await _sut.ListAsync(
            owner.Id,
            project.Id,
            new TaskQuery { Status = TaskItemStatus.Done, Priority = TaskPriority.High },
            CancellationToken.None);

        var only = Assert.Single(result.Items);
        Assert.Equal("B", only.Title);
        Assert.Equal(1, result.TotalCount);
    }

    [Fact]
    public async Task List_SearchMatchesTitleAndDescription_IgnoringCase()
    {
        var (owner, project) = await SeedProjectAsync();
        await AddTaskAsync(project.Id, "Deploy to STAGING");
        await AddTaskAsync(project.Id, "Write release notes", description: "mention the staging rollout");
        await AddTaskAsync(project.Id, "Unrelated");

        var result = await _sut.ListAsync(
            owner.Id, project.Id, new TaskQuery { Search = "  Staging " }, CancellationToken.None);

        Assert.Equal(2, result.TotalCount);
        Assert.DoesNotContain(result.Items, t => t.Title == "Unrelated");
    }

    [Fact]
    public async Task List_PagesResults_AndReportsTotals()
    {
        var (owner, project) = await SeedProjectAsync();
        for (var i = 1; i <= 5; i++)
        {
            await AddTaskAsync(project.Id, $"Task {i}", createdMinutesAgo: i);
        }

        var secondPage = await _sut.ListAsync(
            owner.Id,
            project.Id,
            new TaskQuery { SortBy = "title", Descending = false, Page = 2, PageSize = 2 },
            CancellationToken.None);

        Assert.Equal(5, secondPage.TotalCount);
        Assert.Equal(3, secondPage.TotalPages);
        Assert.Equal(new[] { "Task 3", "Task 4" }, secondPage.Items.Select(t => t.Title).ToArray());
    }

    [Fact]
    public async Task List_SortsByPriorityRank_NotAlphabetically()
    {
        var (owner, project) = await SeedProjectAsync();
        await AddTaskAsync(project.Id, "low", priority: TaskPriority.Low);
        await AddTaskAsync(project.Id, "high", priority: TaskPriority.High);
        await AddTaskAsync(project.Id, "medium", priority: TaskPriority.Medium);

        var result = await _sut.ListAsync(
            owner.Id,
            project.Id,
            new TaskQuery { SortBy = "priority", Descending = true },
            CancellationToken.None);

        Assert.Equal(new[] { "high", "medium", "low" }, result.Items.Select(t => t.Title).ToArray());
    }

    [Theory]
    [InlineData(false, new[] { "soon", "later", "no date" })]
    [InlineData(true, new[] { "later", "soon", "no date" })]
    public async Task List_SortsByDueDate_WithUndatedTasksLast(bool descending, string[] expected)
    {
        var (owner, project) = await SeedProjectAsync();
        await AddTaskAsync(project.Id, "no date");
        await AddTaskAsync(project.Id, "later", due: new DateOnly(2026, 6, 1));
        await AddTaskAsync(project.Id, "soon", due: new DateOnly(2026, 4, 1));

        var result = await _sut.ListAsync(
            owner.Id,
            project.Id,
            new TaskQuery { SortBy = "dueDate", Descending = descending },
            CancellationToken.None);

        Assert.Equal(expected, result.Items.Select(t => t.Title).ToArray());
    }

    [Fact]
    public async Task List_ForAnotherUsersProject_ThrowsNotFound()
    {
        var (_, project) = await SeedProjectAsync();
        var intruder = await TestDb.AddUserAsync(_db, "intruder@example.com");

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.ListAsync(intruder.Id, project.Id, new TaskQuery(), CancellationToken.None));
    }

    [Fact]
    public async Task UpdateStatus_ChangesStatus_AndStampsUpdatedAt()
    {
        var (owner, project) = await SeedProjectAsync();
        var created = await _sut.CreateAsync(
            owner.Id, project.Id, new CreateTaskRequest("Ship it", null, TaskPriority.Medium, null), CancellationToken.None);

        var updated = await _sut.UpdateStatusAsync(
            owner.Id, created.Id, new UpdateTaskStatusRequest(TaskItemStatus.Done), CancellationToken.None);

        Assert.Equal(TaskItemStatus.Done, updated.Status);
        Assert.Equal(TaskItemStatus.Done, (await _db.TaskItems.SingleAsync()).Status);
    }

    [Fact]
    public async Task Update_ReplacesAllEditableFields()
    {
        var (owner, project) = await SeedProjectAsync();
        var created = await _sut.CreateAsync(
            owner.Id, project.Id, new CreateTaskRequest("Old", "old text", TaskPriority.Low, null), CancellationToken.None);

        var updated = await _sut.UpdateAsync(
            owner.Id,
            created.Id,
            new UpdateTaskRequest("New", null, TaskItemStatus.InProgress, TaskPriority.High, new DateOnly(2026, 5, 5)),
            CancellationToken.None);

        Assert.Equal("New", updated.Title);
        Assert.Null(updated.Description);
        Assert.Equal(TaskItemStatus.InProgress, updated.Status);
        Assert.Equal(TaskPriority.High, updated.Priority);
        Assert.Equal(new DateOnly(2026, 5, 5), updated.DueDate);
    }

    [Fact]
    public async Task Delete_ByAnotherUser_ThrowsNotFound_AndKeepsTheTask()
    {
        var (owner, project) = await SeedProjectAsync();
        var intruder = await TestDb.AddUserAsync(_db, "intruder@example.com");
        var created = await _sut.CreateAsync(
            owner.Id, project.Id, new CreateTaskRequest("Keep me", null, TaskPriority.Low, null), CancellationToken.None);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.DeleteAsync(intruder.Id, created.Id, CancellationToken.None));

        Assert.Equal(1, await _db.TaskItems.CountAsync());
    }

    [Fact]
    public async Task Delete_ByOwner_RemovesTheTask()
    {
        var (owner, project) = await SeedProjectAsync();
        var created = await _sut.CreateAsync(
            owner.Id, project.Id, new CreateTaskRequest("Remove me", null, TaskPriority.Low, null), CancellationToken.None);

        await _sut.DeleteAsync(owner.Id, created.Id, CancellationToken.None);

        Assert.Equal(0, await _db.TaskItems.CountAsync());
    }
}
