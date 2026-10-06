import { Inbox, SearchX } from "lucide-react";
import { useCallback, useState } from "react";
import { useLocation } from "react-router";
import { api } from "../api/endpoints";
import { MAX_BULK_REPLAY, type BulkReplayResponse } from "../api/types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingRegion, Skeleton } from "../components/Skeleton";
import { BulkReplayDialog } from "../features/jobs/BulkReplayDialog";
import { JobsFilters } from "../features/jobs/JobsFilters";
import { JobsTable } from "../features/jobs/JobsTable";
import { hasActiveFilters, toApiParams } from "../features/jobs/listParams";
import { Pagination } from "../features/jobs/Pagination";
import { useJobActions } from "../features/jobs/useJobActions";
import { useJobListState } from "../features/jobs/useJobListState";
import { useApiQuery } from "../hooks/useApiQuery";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { pluralize } from "../lib/format";
import { useSelectionStore } from "../stores/selectionStore";
import { useToastStore } from "../stores/toastStore";

function TableSkeleton() {
  return (
    <LoadingRegion label="Loading jobs">
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function JobsPage() {
  useDocumentTitle("Jobs");
  const { state, update, clearFilters } = useJobListState();
  const location = useLocation();
  const selected = useSelectionStore((s) => s.ids);
  const [bulkOpen, setBulkOpen] = useState(false);

  const queryKey = JSON.stringify(state);
  const { data, error, isLoading, retryAt, reload } = useApiQuery(
    (signal) => api.listJobs(toApiParams(state), signal),
    queryKey,
  );
  const { busyIds, run } = useJobActions(reload);

  // Selection only counts dead jobs that are visible, so stale ids never reach the API.
  const items = data?.items ?? [];
  const deadOnPage = items.filter((job) => job.status === "dead");
  const selectedIds = deadOnPage.filter((job) => selected.has(job.id)).map((job) => job.id);

  const changeView = useCallback(
    (...args: Parameters<typeof update>) => {
      useSelectionStore.getState().clear();
      update(...args);
    },
    [update],
  );

  function toggleRow(id: string) {
    if (!selected.has(id) && selectedIds.length >= MAX_BULK_REPLAY) {
      useToastStore
        .getState()
        .push("info", `You can replay at most ${MAX_BULK_REPLAY} jobs at a time.`);
      return;
    }
    useSelectionStore.getState().toggle(id);
  }

  function toggleAll(select: boolean) {
    const store = useSelectionStore.getState();
    const ids = deadOnPage.map((job) => job.id);
    if (!select) return store.remove(ids);
    store.add(ids.slice(0, MAX_BULK_REPLAY));
    if (ids.length > MAX_BULK_REPLAY) {
      useToastStore
        .getState()
        .push("info", `Selected the first ${MAX_BULK_REPLAY}, the most you can replay at once.`);
    }
  }

  function handleBulkFinished(result: BulkReplayResponse) {
    useSelectionStore.getState().remove(result.replayed);
    const toast = useToastStore.getState();
    if (result.failed.length === 0) {
      toast.push("success", `Replayed ${pluralize(result.replayed.length, "job")}.`);
    } else {
      toast.push(
        "error",
        `Replayed ${result.replayed.length}, ${result.failed.length} failed. See the dialog for details.`,
      );
    }
    reload();
  }

  const filtersActive = hasActiveFilters(state);
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  let content;
  if (error) {
    content = <ErrorState message={error.message} onRetry={reload} retryAt={retryAt} />;
  } else if (!data) {
    content = <TableSkeleton />;
  } else if (data.total === 0) {
    content = filtersActive ? (
      <EmptyState
        icon={SearchX}
        title="No jobs match these filters"
        description="Try a different status or queue, or search for another ID prefix."
        action={<Button onClick={clearFilters}>Clear filters</Button>}
      />
    ) : (
      <EmptyState
        icon={Inbox}
        title="No jobs yet"
        description="Jobs show up here as soon as they are enqueued."
      />
    );
  } else if (data.items.length === 0) {
    content = (
      <EmptyState
        icon={SearchX}
        title="This page is past the end"
        description={`There are only ${pageCount} pages for the current filters.`}
        action={<Button onClick={() => changeView({ page: 1 })}>Go to the first page</Button>}
      />
    );
  } else {
    content = (
      <div className="flex flex-col gap-4" aria-busy={isLoading}>
        <p className="text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
          Showing {(data.page - 1) * data.page_size + 1}–
          {(data.page - 1) * data.page_size + data.items.length} of {data.total} jobs
        </p>
        {selectedIds.length > 0 && (
          <div
            role="region"
            aria-label="Bulk actions"
            className="flex flex-wrap items-center gap-3 rounded-md bg-indigo-50 px-3 py-2 dark:bg-indigo-950"
          >
            <span className="text-sm font-medium" aria-live="polite">
              {selectedIds.length} selected
            </span>
            <Button variant="primary" size="sm" onClick={() => setBulkOpen(true)}>
              Replay {pluralize(selectedIds.length, "dead job")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => useSelectionStore.getState().clear()}>
              Clear selection
            </Button>
          </div>
        )}
        <div className={isLoading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <JobsTable
            jobs={data.items}
            sort={state.sort}
            order={state.order}
            onSort={(field) =>
              changeView({
                sort: field,
                order: state.sort === field && state.order === "desc" ? "asc" : "desc",
              })
            }
            selectedIds={selected}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            busyIds={busyIds}
            onAction={run}
            returnSearch={location.search}
          />
        </div>
        <Pagination
          page={data.page}
          pageSize={data.page_size}
          total={data.total}
          onPageChange={(page) => changeView({ page })}
          onPageSizeChange={(pageSize) => changeView({ pageSize })}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Jobs</h1>
      <JobsFilters state={state} onChange={changeView} onClear={clearFilters} />
      {content}
      <BulkReplayDialog
        open={bulkOpen}
        ids={selectedIds}
        onClose={() => setBulkOpen(false)}
        onFinished={handleBulkFinished}
      />
    </div>
  );
}
