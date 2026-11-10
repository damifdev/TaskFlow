import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError, getErrorMessage } from "@/api/errors";

/**
 * Copies server-side validation errors onto matching form fields.
 * Returns a message for anything that could not be attached to a field (to show above the form),
 * or null when every error landed on a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError) || !error.hasFieldErrors) return getErrorMessage(error);

  const unmatched: string[] = [];
  for (const [name, messages] of Object.entries(error.fieldErrors)) {
    const field = fields.find((candidate) => candidate === name);
    if (field) setError(field, { type: "server", message: messages.join(" ") });
    else unmatched.push(...messages);
  }
  return unmatched.length > 0 ? unmatched.join(" ") : null;
}

/**
 * For forms inside modals, where non-validation failures already appear as a toast:
 * only handles validation errors and returns the part that matched no field, if any.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  return error instanceof ApiError && error.hasFieldErrors ? applyServerErrors(error, setError, fields) : null;
}
