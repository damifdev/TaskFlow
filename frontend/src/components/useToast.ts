import { useCallback, useContext } from "react";
import { ApiError, getErrorMessage } from "@/api/errors";
import { ToastContext, type ToastApi } from "./ToastContext";

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

/**
 * Error handler for mutations. Field-level validation errors are shown inline by the
 * form that submitted them, so they are not duplicated as a toast.
 */
export function useMutationErrorToast(): (error: unknown) => void {
  const toast = useToast();
  return useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.hasFieldErrors) return;
      toast.error(getErrorMessage(error));
    },
    [toast],
  );
}
