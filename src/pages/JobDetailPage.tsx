import { ArrowLeft, History, SearchX } from "lucide-react";
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Time({ iso }: { iso: string | null }) {
  return iso ? <time dateTime={iso}>{formatDateTime(iso)}</time> : <>–</>;
}

function JobSummary({ job }: { job: Job }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Field label="Status">
        <StatusBadge status={job.status} />
      </Field>
      <Field label="Queue">{job.queue}</Field>
      <Field label="Attempts">
        {job.attempts} of {job.max_attempts}
      </Field>
      <Field label="Created">
        <Time iso={job.created_at} />
      </Field>
      <Field label="Updated">
        <Time iso={job.updated_at} />
      </Field>
      <Field label="Next attempt">
        <Time iso={job.next_attempt_at} />
      </Field>
    </dl>
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
        "inline-flex w-fit items-center gap-1 rounded text-sm font-medium text-indigo-700 underline dark:text-indigo-300",
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="break-all font-mono text-xl font-semibold">{data.id}</h1>
          <ActionButton job={data} busy={busyIds.has(data.id)} onRun={run} />
        </div>
        <JobSummary job={data} />
        {data.last_error && (
          <section aria-labelledby="last-error-heading">
            <h2 id="last-error-heading" className="mb-2 text-lg font-semibold">
              Last error
            </h2>
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm dark:border-red-900 dark:bg-red-950/40">
              {data.last_error}
            </p>
          </section>
        )}
        <AttemptsSection jobId={data.id} reloadKey={attemptsVersion} />
        <section aria-labelledby="payload-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="payload-heading" className="text-lg font-semibold">
              Payload
            </h2>
            <CopyButton text={payload} label="Copy payload" />
          </div>
          <pre
            tabIndex={0}
            aria-labelledby="payload-heading"
            className={cn(
              "overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900",
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
    <div className="flex flex-col gap-4">
      {back}
      {content}
    </div>
  );
}
