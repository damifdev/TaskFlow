using TaskFlow.Application.Auth;
using TaskFlow.Application.Projects;
using TaskFlow.Application.Tasks;
using TaskFlow.Domain.Enums;

namespace TaskFlow.UnitTests;

public sealed class ValidatorTests
{
    private readonly RegisterRequestValidator _register = new();
    private readonly CreateTaskRequestValidator _createTask = new();
    private readonly CreateProjectRequestValidator _createProject = new();
    private readonly TaskQueryValidator _query = new();

    [Fact]
    public void Register_AcceptsAValidRequest()
    {
        var result = _register.Validate(new RegisterRequest("alice@example.com", "Password1", "Alice"));

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("", "Password1", "Alice", "Email")]
    [InlineData("not-an-email", "Password1", "Alice", "Email")]
    [InlineData("alice@example.com", "short1", "Alice", "Password")]
    [InlineData("alice@example.com", "onlyletters", "Alice", "Password")]
    [InlineData("alice@example.com", "12345678", "Alice", "Password")]
    [InlineData("alice@example.com", "Password1", "A", "DisplayName")]
    public void Register_RejectsInvalidFields(string email, string password, string displayName, string expectedField)
    {
        var result = _register.Validate(new RegisterRequest(email, password, displayName));

        Assert.Contains(result.Errors, e => e.PropertyName == expectedField);
    }

    [Fact]
    public void CreateTask_RejectsBlankAndOverlongTitles()
    {
        Assert.False(_createTask.Validate(new CreateTaskRequest("   ", null, TaskPriority.Low, null)).IsValid);
        Assert.False(_createTask.Validate(new CreateTaskRequest(new string('x', 201), null, TaskPriority.Low, null)).IsValid);
        Assert.True(_createTask.Validate(new CreateTaskRequest(new string('x', 200), null, TaskPriority.Low, null)).IsValid);
    }

    [Fact]
    public void CreateTask_RejectsUnknownPriorityValues()
    {
        var result = _createTask.Validate(new CreateTaskRequest("Title", null, (TaskPriority)42, null));

        Assert.Contains(result.Errors, e => e.PropertyName == "Priority");
    }

    [Fact]
    public void CreateProject_EnforcesNameAndDescriptionLengths()
    {
        Assert.True(_createProject.Validate(new CreateProjectRequest("Roadmap", null)).IsValid);
        Assert.False(_createProject.Validate(new CreateProjectRequest("", null)).IsValid);
        Assert.False(_createProject.Validate(new CreateProjectRequest(new string('x', 121), null)).IsValid);
        Assert.False(_createProject.Validate(new CreateProjectRequest("Roadmap", new string('x', 1001))).IsValid);
    }

    [Fact]
    public void TaskQuery_AcceptsDefaults()
    {
        Assert.True(_query.Validate(new TaskQuery()).IsValid);
    }

    [Theory]
    [InlineData("createdAt")]
    [InlineData("DUEDATE")]
    [InlineData("priority")]
    [InlineData("title")]
    public void TaskQuery_AcceptsKnownSortFields_IgnoringCase(string sortBy)
    {
        Assert.True(_query.Validate(new TaskQuery { SortBy = sortBy }).IsValid);
    }

    [Theory]
    [InlineData("password")]
    [InlineData("")]
    public void TaskQuery_RejectsUnknownSortFields(string sortBy)
    {
        Assert.False(_query.Validate(new TaskQuery { SortBy = sortBy }).IsValid);
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(1, 0)]
    [InlineData(1, 101)]
    public void TaskQuery_RejectsOutOfRangePaging(int page, int pageSize)
    {
        Assert.False(_query.Validate(new TaskQuery { Page = page, PageSize = pageSize }).IsValid);
    }
}
