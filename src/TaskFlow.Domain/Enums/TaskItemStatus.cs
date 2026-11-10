namespace TaskFlow.Domain.Enums;

// Named TaskItemStatus (not TaskStatus) to avoid clashing with System.Threading.Tasks.TaskStatus.
public enum TaskItemStatus
{
    Todo = 0,
    InProgress = 1,
    Done = 2
}
