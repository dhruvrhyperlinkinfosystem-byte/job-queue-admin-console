import { Inbox } from "lucide-react";
import { Link } from "react-router";
import { api } from "../api/endpoints";
import type { JobStatus, QueueSummary } from "../api/types";
import { focusRing } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageHeader } from "../components/PageHeader";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useApiQuery } from "../hooks/useApiQuery";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { cn } from "../lib/cn";
import { pluralize } from "../lib/format";
import { STATUS_LABELS } from "../lib/status";
import { STATUS_STYLES } from "../lib/statusStyles";

const COUNTED_STATUSES = ["pending", "running", "failed", "dead"] as const;
type CountedStatus = (typeof COUNTED_STATUSES)[number];

// Decorative bar segments; the counts and badges carry the information.
const BAR_COLORS: Record<CountedStatus, string> = {
  pending: "bg-slate-400 dark:bg-slate-500",
  running: "bg-blue-500",
  failed: "bg-amber-500",
  dead: "bg-red-500",
};

function jobsLink(queue: string, status: JobStatus): string {
  const params = new URLSearchParams({ queue });
  params.append("status", status);
  return `/jobs?${params.toString()}`;
}

function totalsOf(queues: QueueSummary[]): Record<CountedStatus, number> {
  const totals = { pending: 0, running: 0, failed: 0, dead: 0 };
  for (const queue of queues)
    for (const status of COUNTED_STATUSES) totals[status] += queue[status];
  return totals;
}

function TotalsStrip({ queues }: { queues: QueueSummary[] }) {
  const totals = totalsOf(queues);
  return (
    <section aria-label="Totals across all queues">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {COUNTED_STATUSES.map((status) => {
          const { icon: Icon } = STATUS_STYLES[status];
          return (
            <div key={status} className="card flex items-center gap-3 p-4">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                  STATUS_STYLES[status].classes,
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {STATUS_LABELS[status]}
                </dt>
                <dd className="text-2xl font-semibold tabular-nums">{totals[status]}</dd>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function ProportionBar({ queue }: { queue: QueueSummary }) {
  const total = COUNTED_STATUSES.reduce((sum, status) => sum + queue[status], 0);
  return (
    <div
      aria-hidden="true"
      className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
    >
      {total > 0 &&
        COUNTED_STATUSES.map((status) =>
          queue[status] > 0 ? (
            <div
              key={status}
              className={BAR_COLORS[status]}
              style={{ width: `${(queue[status] / total) * 100}%` }}
            />
          ) : null,
        )}
    </div>
  );
}

function QueueCard({ queue }: { queue: QueueSummary }) {
  const open = queue.pending + queue.running + queue.failed + queue.dead;
  return (
    <section aria-labelledby={`queue-${queue.name}`} className="card flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={`queue-${queue.name}`} className="text-lg font-semibold">
          {queue.name}
        </h2>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {pluralize(open, "open job")}
        </span>
      </div>
      <ProportionBar queue={queue} />
      <ul className="grid grid-cols-2 gap-2">
        {COUNTED_STATUSES.map((status) => (
          <li key={status}>
            <Link
              to={jobsLink(queue.name, status)}
              aria-label={`${queue[status]} ${STATUS_LABELS[status].toLowerCase()} jobs in ${queue.name}`}
              className={cn(
                "group flex flex-col items-start gap-1.5 rounded-lg border border-slate-200 p-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40",
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
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-60 rounded-xl" />
          ))}
        </div>
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
      <div className="flex flex-col gap-6">
        <TotalsStrip queues={data.items} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.items.map((queue) => (
            <QueueCard key={queue.name} queue={queue} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Queues"
        description="Open jobs in each queue. Select a count to see those jobs."
      />
      {content}
    </div>
  );
}
