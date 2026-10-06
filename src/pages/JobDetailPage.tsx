import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  CircleAlert,
  CircleCheck,
  History,
  Layers,
  RefreshCw,
  Repeat,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { api } from "../api/endpoints";
import type { Job } from "../api/types";
import { focusRing } from "../components/Button";
import { CopyButton } from "../components/CopyButton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { ActionButton } from "../features/jobs/ActionButton";
import { AttemptsTable } from "../features/jobs/AttemptsTable";
import { useJobActions } from "../features/jobs/useJobActions";
import { useApiQuery } from "../hooks/useApiQuery";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { cn } from "../lib/cn";
import { formatDateTime } from "../lib/format";

function returnSearchFrom(state: unknown): string {
  if (typeof state === "object" && state !== null && "returnSearch" in state) {
    return typeof state.returnSearch === "string" ? state.returnSearch : "";
  }
  return "";
}

function useReloadCounter() {
  const [count, setCount] = useState(0);
  const bump = useCallback(() => setCount((value) => value + 1), []);
  return [count, bump] as const;
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {label}
      </dt>
      <dd className="pl-10 text-sm">{children}</dd>
    </div>
  );
}

function Time({ iso }: { iso: string | null }) {
  return iso ? <time dateTime={iso}>{formatDateTime(iso)}</time> : <>–</>;
}

function JobSummary({ job }: { job: Job }) {
  return (
    <dl className="card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Queue" icon={Layers}>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {job.queue}
        </span>
      </Field>
      <Field label="Attempts" icon={Repeat}>
        {job.attempts} of {job.max_attempts}
      </Field>
      <Field label="Next attempt" icon={RefreshCw}>
        <Time iso={job.next_attempt_at} />
      </Field>
      <Field label="Created" icon={CalendarPlus}>
        <Time iso={job.created_at} />
      </Field>
      <Field label="Updated" icon={CalendarClock}>
        <Time iso={job.updated_at} />
      </Field>
    </dl>
  );
}

function LastError({ message }: { message: string | null }) {
  return (
    <section
      aria-labelledby="last-error-heading"
      className={cn(
        "flex gap-3 rounded-xl border p-4",
        message
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
      )}
    >
      {message ? (
        <CircleAlert
          className="mt-0.5 size-5 shrink-0 text-red-700 dark:text-red-300"
          aria-hidden="true"
        />
      ) : (
        <CircleCheck
          className="mt-0.5 size-5 shrink-0 text-slate-500 dark:text-slate-400"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0">
        <h2 id="last-error-heading" className="text-sm font-semibold">
          Last error
        </h2>
        <p
          className={cn(
            "mt-1 break-words text-sm",
            message ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400",
          )}
        >
          {message ?? "No error recorded."}
        </p>
      </div>
    </section>
  );
}

function AttemptsSection({ jobId, reloadKey }: { jobId: string; reloadKey: number }) {
  const { data, error, retryAt, reload } = useApiQuery(
    (signal) => api.listAttempts(jobId, signal),
    `${jobId}:${reloadKey}`,
  );
  let content;
  if (error) {
    content = (
      <ErrorState
        title="Could not load attempts"
        message={error.message}
        onRetry={reload}
        retryAt={retryAt}
      />
    );
  } else if (!data) {
    content = (
      <LoadingRegion label="Loading attempts">
        <Skeleton className="h-24" />
      </LoadingRegion>
    );
  } else if (data.items.length === 0) {
    content = (
      <EmptyState
        icon={History}
        title="No attempts yet"
        description="This job has not been picked up by a worker."
      />
    );
  } else {
    content = <AttemptsTable attempts={data.items} />;
  }
  return (
    <section aria-labelledby="attempts-heading" className="flex flex-col gap-3">
      <h2 id="attempts-heading" className="text-lg font-semibold">
        Attempts
      </h2>
      {content}
    </section>
  );
}

export function JobDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  useDocumentTitle(`Job ${id}`);
  const job = useApiQuery((signal) => api.getJob(id, signal), id);
  const { reload } = job;
  // Bump after an action so the attempts list refetches alongside the job.
  const [attemptsVersion, bumpAttempts] = useReloadCounter();
  const refreshAll = useCallback(() => {
    reload();
    bumpAttempts();
  }, [reload, bumpAttempts]);
  const { busyIds, run } = useJobActions(refreshAll);

  const backTo = `/jobs${returnSearchFrom(location.state)}`;
  const back = (
    <Link
      to={backTo}
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded text-sm font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300",
        focusRing,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to jobs
    </Link>
  );

  let content;
  if (job.error?.status === 404) {
    content = (
      <EmptyState
        icon={SearchX}
        title="Job not found"
        description={`No job with the ID ${id} exists. It may have been removed or the link may be wrong.`}
      />
    );
  } else if (job.error) {
    content = (
      <ErrorState
        title="Could not load this job"
        message={job.error.message}
        onRetry={job.reload}
        retryAt={job.retryAt}
      />
    );
  } else if (!job.data) {
    content = (
      <LoadingRegion label="Loading job">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      </LoadingRegion>
    );
  } else {
    const data = job.data;
    const payload = JSON.stringify(data.payload, null, 2);
    content = (
      <div className="flex flex-col gap-6" aria-busy={job.isLoading}>
        <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="break-all font-mono text-xl font-semibold">{data.id}</h1>
            <div>
              <StatusBadge status={data.status} className="px-3 py-1 text-sm" />
            </div>
          </div>
          <ActionButton job={data} busy={busyIds.has(data.id)} onRun={run} />
        </div>
        <JobSummary job={data} />
        <LastError message={data.last_error} />
        <AttemptsSection jobId={data.id} reloadKey={attemptsVersion} />
        <section aria-labelledby="payload-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="payload-heading" className="text-lg font-semibold">
              Payload
            </h2>
            <CopyButton
              text={payload}
              label="Copy payload"
              successMessage="Payload copied to clipboard."
            />
          </div>
          <pre
            tabIndex={0}
            aria-labelledby="payload-heading"
            className={cn(
              "overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-slate-100 shadow-card",
              focusRing,
            )}
          >
            <code>{payload}</code>
          </pre>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {back}
      {/* The job's own heading only exists once it has loaded; keep one h1 on the page meanwhile. */}
      {!job.data && <h1 className="sr-only">Job details</h1>}
      {content}
    </div>
  );
}
