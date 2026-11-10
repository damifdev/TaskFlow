export type FieldErrors = Record<string, string[]>;

interface ApiErrorInit {
  status: number;
  message: string;
  title?: string;
  detail?: string;
  traceId?: string;
  fieldErrors?: FieldErrors;
}

/** Error thrown for every non-2xx response and for network failures (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly title?: string;
  readonly detail?: string;
  readonly traceId?: string;
  /** Validation messages keyed by normalised (camelCase) field name. */
  readonly fieldErrors: FieldErrors;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.title = init.title;
    this.detail = init.detail;
    this.traceId = init.traceId;
    this.fieldErrors = init.fieldErrors ?? {};
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }

  static network(): ApiError {
    return new ApiError({
      status: 0,
      message: "Could not reach the server. Check your connection and try again.",
    });
  }

  /** Builds an ApiError from an RFC 7807 ProblemDetails (or validation) response body. */
  static async fromResponse(response: Response): Promise<ApiError> {
    const body = await readJsonObject(response);
    const title = typeof body?.title === "string" ? body.title : undefined;
    const detail = typeof body?.detail === "string" ? body.detail : undefined;
    const traceId = typeof body?.traceId === "string" ? body.traceId : undefined;
    const fieldErrors = parseFieldErrors(body?.errors);
    const hasFieldErrors = Object.keys(fieldErrors).length > 0;

    return new ApiError({
      status: response.status,
      message: hasFieldErrors
        ? "Please correct the highlighted fields."
        : (detail ?? title ?? defaultMessage(response.status)),
      title,
      detail,
      traceId,
      fieldErrors,
    });
  }
}

/** "$.Email" -> "email", "DisplayName" -> "displayName". */
export function normalizeFieldName(key: string): string {
  const stripped = key.startsWith("$.") ? key.slice(2) : key;
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  return error instanceof ApiError ? error.message : fallback;
}

function defaultMessage(status: number): string {
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "The requested item could not be found.";
  if (status >= 500) return "The server ran into a problem. Please try again shortly.";
  return "Something went wrong. Please try again.";
}

async function readJsonObject(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await response.json();
    return typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseFieldErrors(errors: unknown): FieldErrors {
  const result: FieldErrors = {};
  if (typeof errors !== "object" || errors === null) return result;

  for (const [key, value] of Object.entries(errors)) {
    const messages = (Array.isArray(value) ? value : [value]).filter(
      (m): m is string => typeof m === "string" && m.length > 0,
    );
    if (messages.length === 0) continue;
    const name = normalizeFieldName(key);
    result[name] = [...(result[name] ?? []), ...messages];
  }
  return result;
}
