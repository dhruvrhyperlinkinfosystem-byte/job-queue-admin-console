import { Inbox } from "lucide-react";
import { Link } from "react-router";
import { api } from "../api/endpoints";
import type { JobStatus, QueueSummary } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useApiQuery } from "../hooks/useApiQuery";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { focusRing } from "../components/Button";
import { cn } from "../lib/cn";
import { STATUS_LABELS } from "../lib/status";

const COUNTED_STATUSES = ["pending", "running", "failed", "dead"] as const;

function jobsLink(queue: string, status: JobStatus): string {
  const params = new URLSearchParams({ queue });
  params.append("status", status);
  return `/jobs?${params.toString()}`;
}

function QueueCard({ queue }: { queue: QueueSummary }) {
  return (
    <section
      aria-labelledby={`queue-${queue.name}`}
      className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
    >
      <h2 id={`queue-${queue.name}`} className="mb-3 text-lg font-semibold">
        {queue.name}
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {COUNTED_STATUSES.map((status) => (
          <li key={status}>
            <Link
              to={jobsLink(queue.name, status)}
              aria-label={`${queue[status]} ${STATUS_LABELS[status].toLowerCase()} jobs in ${queue.name}`}
              className={cn(
                "flex flex-col items-start gap-1 rounded-md border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                focusRing,
              )}
            >
              <span className="text-2xl font-semibold tabular-nums">{queue[status]}</span>
              <StatusBadge status={status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QueuesSkeleton() {
  return (
    <LoadingRegion label="Loading queues">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function QueuesPage() {
  useDocumentTitle("Queues");
  const { data, error, retryAt, reload } = useApiQuery(
    (signal) => api.listQueues(signal),
    "queues",
  );

  let content;
  if (error) {
    content = <ErrorState message={error.message} onRetry={reload} retryAt={retryAt} />;
  } else if (!data) {
    content = <QueuesSkeleton />;
  } else if (data.items.length === 0) {
    content = (
      <EmptyState
        icon={Inbox}
        title="No queues yet"
        description="Queues appear here once the service has received its first job."
      />
    );
  } else {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.items.map((queue) => (
          <QueueCard key={queue.name} queue={queue} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Queues</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Select a count to see those jobs.
        </p>
      </div>
      {content}
    </div>
  );
}
