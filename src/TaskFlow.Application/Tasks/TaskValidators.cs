using FluentValidation;

namespace TaskFlow.Application.Tasks;

public sealed class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
{
    public CreateTaskRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.Priority).IsInEnum();
    }
}

public sealed class UpdateTaskRequestValidator : AbstractValidator<UpdateTaskRequest>
{
    public UpdateTaskRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.Priority).IsInEnum();
    }
}

public sealed class UpdateTaskStatusRequestValidator : AbstractValidator<UpdateTaskStatusRequest>
{
    public UpdateTaskStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
    }
}

public sealed class TaskQueryValidator : AbstractValidator<TaskQuery>
{
    private static readonly string[] AllowedSortFields = ["createdAt", "dueDate", "priority", "title"];

    public TaskQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(100);

        RuleFor(x => x.SortBy)
            .Must(field => AllowedSortFields.Contains(field, StringComparer.OrdinalIgnoreCase))
            .WithMessage("SortBy must be one of: createdAt, dueDate, priority, title.");

        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
    }
}
