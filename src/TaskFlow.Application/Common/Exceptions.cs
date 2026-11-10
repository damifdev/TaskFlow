namespace TaskFlow.Application.Common;

/// <summary>
/// Expected, user-facing failures. The API layer maps each subtype to an HTTP status code
/// (see GlobalExceptionHandler), so services never need to know about HTTP.
/// </summary>
public abstract class AppException : Exception
{
    protected AppException(string message) : base(message)
    {
    }
}

public sealed class NotFoundException : AppException
{
    public NotFoundException(string message) : base(message)
    {
    }
}

public sealed class ConflictException : AppException
{
    public ConflictException(string message) : base(message)
    {
    }
}

public sealed class AuthenticationFailedException : AppException
{
    public AuthenticationFailedException(string message) : base(message)
    {
    }
}
