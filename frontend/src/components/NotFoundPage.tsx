import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { EmptyState } from "./EmptyState";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      action={
        <Link to="/" className="btn btn-primary">
          Back to projects
        </Link>
      }
    />
  );
}
