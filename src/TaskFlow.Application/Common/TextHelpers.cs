namespace TaskFlow.Application.Common;

internal static class TextHelpers
{
    /// <summary>Trims the value and turns blank input into null so the database never stores empty strings.</summary>
    public static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
