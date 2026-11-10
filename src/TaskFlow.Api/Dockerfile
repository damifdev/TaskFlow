# Build context is the repository root:  docker build -f src/TaskFlow.Api/Dockerfile .

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the project files first so the restore layer is cached until dependencies change.
COPY Directory.Build.props Directory.Packages.props ./
COPY src/TaskFlow.Domain/TaskFlow.Domain.csproj src/TaskFlow.Domain/
COPY src/TaskFlow.Application/TaskFlow.Application.csproj src/TaskFlow.Application/
COPY src/TaskFlow.Infrastructure/TaskFlow.Infrastructure.csproj src/TaskFlow.Infrastructure/
COPY src/TaskFlow.Api/TaskFlow.Api.csproj src/TaskFlow.Api/
RUN dotnet restore src/TaskFlow.Api/TaskFlow.Api.csproj

COPY src/ src/
RUN dotnet publish src/TaskFlow.Api/TaskFlow.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# The official aspnet image ships a non-root "app" user; never run the API as root.
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "TaskFlow.Api.dll"]
