using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace TaskFlow.Api.Filters;

/// <summary>
/// Runs the FluentValidation validator registered for each action argument (if any) and short-circuits with
/// a 400 ValidationProblemDetails response, so controllers only ever see valid input.
/// </summary>
public sealed class FluentValidationFilter(IServiceProvider services) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var errors = new Dictionary<string, List<string>>();

        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null)
            {
                continue;
            }

            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (services.GetService(validatorType) is not IValidator validator)
            {
                continue;
            }

            var result = await validator.ValidateAsync(
                new ValidationContext<object>(argument),
                context.HttpContext.RequestAborted);

            foreach (var failure in result.Errors)
            {
                // camelCase keys match the JSON the client sends, so the UI can attach messages to fields.
                var key = JsonNamingPolicy.CamelCase.ConvertName(failure.PropertyName);

                if (!errors.TryGetValue(key, out var messages))
                {
                    messages = new List<string>();
                    errors[key] = messages;
                }

                messages.Add(failure.ErrorMessage);
            }
        }

        if (errors.Count > 0)
        {
            var problem = new ValidationProblemDetails(
                errors.ToDictionary(entry => entry.Key, entry => entry.Value.ToArray()));

            context.Result = new BadRequestObjectResult(problem);
            return;
        }

        await next();
    }
}
