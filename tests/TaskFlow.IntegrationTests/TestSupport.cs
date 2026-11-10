using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using TaskFlow.Application.Auth;
using TaskFlow.Application.Projects;
using TaskFlow.Application.Tasks;
using TaskFlow.Domain.Enums;

namespace TaskFlow.IntegrationTests;

internal static class TestJson
{
    /// <summary>Same settings the API uses: camelCase properties and enums as strings.</summary>
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };
}

internal static class HttpClientExtensions
{
    public static HttpClient WithToken(this HttpClient client, string accessToken)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    public static Task<HttpResponseMessage> PostJsonAsync<T>(this HttpClient client, string url, T body) =>
        client.PostAsJsonAsync(url, body, TestJson.Options);

    public static Task<HttpResponseMessage> PutJsonAsync<T>(this HttpClient client, string url, T body) =>
        client.PutAsJsonAsync(url, body, TestJson.Options);

    public static Task<HttpResponseMessage> PatchJsonAsync<T>(this HttpClient client, string url, T body) =>
        client.PatchAsync(url, JsonContent.Create(body, options: TestJson.Options));

    public static async Task<T> ReadAsAsync<T>(this HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<T>(TestJson.Options))!;

    public static async Task<ProjectDto> CreateProjectAsync(this HttpClient client, string name = "Roadmap")
    {
        var response = await client.PostJsonAsync("/api/projects", new CreateProjectRequest(name, null));
        response.EnsureSuccessStatusCode();
        return await response.ReadAsAsync<ProjectDto>();
    }

    public static async Task<TaskDto> CreateTaskAsync(
        this HttpClient client,
        Guid projectId,
        string title = "Write tests",
        TaskPriority priority = TaskPriority.Medium,
        DateOnly? dueDate = null)
    {
        var response = await client.PostJsonAsync(
            $"/api/projects/{projectId}/tasks",
            new CreateTaskRequest(title, null, priority, dueDate));
        response.EnsureSuccessStatusCode();
        return await response.ReadAsAsync<TaskDto>();
    }
}

internal sealed record TestUser(HttpClient Client, AuthResponse Auth);

internal static class TestUsers
{
    public const string Password = "Password1";

    /// <summary>Registers a brand-new user and returns a client that is already signed in as them.</summary>
    public static async Task<TestUser> RegisterAsync(this TaskFlowFactory factory, string? email = null)
    {
        var client = factory.CreateClient();
        email ??= $"user-{Guid.NewGuid():N}@example.com";

        var response = await client.PostJsonAsync("/api/auth/register", new RegisterRequest(email, Password, "Test User"));
        response.EnsureSuccessStatusCode();

        var auth = await response.ReadAsAsync<AuthResponse>();
        client.WithToken(auth.AccessToken);

        return new TestUser(client, auth);
    }
}
