using System.Security.Claims;

namespace TaskFlow.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Reads the user id from the "sub" claim written by TokenService.</summary>
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirst("sub")?.Value;

        return Guid.TryParse(value, out var id)
            ? id
            : throw new InvalidOperationException("The access token does not contain a valid 'sub' claim.");
    }
}
