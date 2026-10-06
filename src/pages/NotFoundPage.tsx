import { FileQuestion } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <EmptyState
      icon={FileQuestion}
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Link to="/" className="text-sm font-medium text-indigo-700 underline dark:text-indigo-300">
          Back to queues
        </Link>
      }
    />
  );
}
