import { getErrorMessage } from "@/api/errors";
import { Button } from "./Button";

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, title = "Something went wrong", onRetry }: ErrorStateProps) {
  return (
    <div className="empty-state empty-state-error" role="alert">
      <h2 className="empty-state-title">{title}</h2>
      <p className="muted">{getErrorMessage(error)}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
