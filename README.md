# TaskFlow

A full-stack task manager: **ASP.NET Core (.NET 10) API** + **React / TypeScript** frontend, backed by PostgreSQL.
Users register, create projects, and manage tasks on a list or kanban board with filtering, search, sorting and paging. Admins get a user/stats overview.

[![CI](https://github.com/damifdev/TaskFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/damifdev/TaskFlow/actions/workflows/ci.yml)

## Features

- JWT access tokens + rotating refresh tokens (hashed in the DB; reuse of a rotated token revokes the user's sessions)
- Role-based authorization (`User`, `Admin`)
- Projects with progress, tasks with status / priority / due date
- Server-side filtering, search, sorting and paging
- Optimistic status changes on the board with rollback on failure
- Validation on both sides (FluentValidation / zod) with field-level errors from the API shown in the forms
- RFC 7807 `ProblemDetails` errors, rate limiting on auth endpoints, health check, structured logging
- Light and dark themes, keyboard-accessible dialogs

## Architecture

```
frontend/ (React 19, Vite, TanStack Query)
    â”‚  /api  (nginx or Vite proxy)
    â–¼
TaskFlow.Api            controllers, auth, middleware, filters, DI wiring
    â”œâ”€â–º TaskFlow.Application     use-case services, DTOs, validators, abstractions
    â”‚        â””â”€â–º TaskFlow.Domain          entities and enums (no dependencies)
    â””â”€â–º TaskFlow.Infrastructure  EF Core / PostgreSQL, JWT, password hashing
```

Dependencies point inward: the Application layer only knows an `IAppDbContext` abstraction, which keeps services unit-testable with an in-memory database.

## Key design decisions

| Decision | Why |
| --- | --- |
| Refresh-token rotation with reuse detection | A stolen refresh token stops working the moment the real user refreshes; replaying a used one signs everything out. Only SHA-256 hashes are stored. |
| Access token in memory, refresh token in `localStorage` | Avoids long-lived tokens in storage reachable on every request. The XSS trade-off versus an httpOnly cookie is documented in `frontend/src/auth/tokenStorage.ts`. |
| Services + FluentValidation filter instead of MediatR | Fewer moving parts for this size of app; validation still runs before the action and errors keep the same camelCase shape the frontend maps onto form fields. |
| `TimeProvider` everywhere | Token expiry and "overdue" logic are tested deterministically. |
| Priority sort uses an explicit rank, due-date nulls last, `Id` tiebreaker | Stable paging; enum string order would be wrong. |
| Single-flight token refresh on the client | Concurrent 401s trigger one refresh call, not many. |
| Central package management | One place to bump dependency versions. |

## Run it

### Everything with Docker

```bash
cp .env.example .env        # set JWT_KEY (openssl rand -base64 48)
docker compose up --build
```

- App: http://localhost:3000
- API docs (Swagger): http://localhost:8080/swagger
- Demo login: `demo@taskflow.dev` / `Demo1234` (seeded). Set `SEED_ADMIN_PASSWORD` in `.env` to also get `admin@taskflow.dev`.

Turn `Seed__Enabled` off for any real deployment.

### Local development

Prerequisites: .NET 10 SDK, Node 22+, PostgreSQL (or `docker compose up db`).

```bash
# API  â†’ http://localhost:5080  (Swagger at /swagger; dev DB + JWT key come from appsettings.Development.json)
dotnet run --project src/TaskFlow.Api

# Frontend â†’ http://localhost:5173  (proxies /api to the API)
cd frontend && npm install && npm run dev
```

The API creates the schema on startup. To use real migrations instead:

```bash
dotnet tool restore
dotnet ef migrations add Initial -p src/TaskFlow.Infrastructure -s src/TaskFlow.Api
```

Once a migration exists the app applies it automatically (`MigrateAsync`) instead of `EnsureCreated`.

## Tests

```bash
dotnet test                 # unit tests (xUnit, Moq, EF InMemory) + API integration tests (WebApplicationFactory)
cd frontend && npm test     # Vitest + Testing Library
cd frontend && npm run lint && npm run typecheck
```

Backend integration tests cover auth (including refresh-token reuse), project and task CRUD, ownership isolation between users, filtering/paging and admin authorization. Frontend tests cover the API client (bearer header, ProblemDetails mapping, single refresh on concurrent 401s), validation schemas, route guards, forms, the optimistic cache update and the modal's focus handling.

## API overview

| Method | Route | Notes |
| --- | --- | --- |
| POST | `/api/auth/register`, `/login`, `/refresh`, `/logout` | rate limited |
| GET | `/api/auth/me` | |
| GET/POST | `/api/projects` | |
| GET/PUT/DELETE | `/api/projects/{id}` | |
| GET/POST | `/api/projects/{id}/tasks` | `status`, `priority`, `search`, `sortBy`, `descending`, `page`, `pageSize` |
| GET/PUT/DELETE | `/api/tasks/{id}` | |
| PATCH | `/api/tasks/{id}/status` | |
| GET | `/api/admin/users`, `/api/admin/stats` | `Admin` role |
| GET | `/health` | |

## Project layout

```
src/        Domain, Application, Infrastructure, Api
tests/      UnitTests, IntegrationTests
frontend/   React app (api/, auth/, components/, features/, hooks/, lib/)
.github/    CI: backend build + tests, frontend lint/typecheck/test/build, Docker image builds
```

## Possible next steps

- httpOnly-cookie refresh tokens with CSRF protection
- Task comments / assignees, and real-time updates over SignalR
- Playwright end-to-end tests against the Docker stack
