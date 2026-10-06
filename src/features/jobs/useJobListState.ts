import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { applyListState, parseListState, type JobListState } from "./listParams";

interface UpdateOptions {
  /** Replace the history entry instead of adding one (used while typing in search). */
  replace?: boolean;
  /** Keep the current page. Everything except paging resets to page 1. */
  keepPage?: boolean;
}

export function useJobListState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseListState(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<JobListState>, { replace = false, keepPage = false }: UpdateOptions = {}) => {
      setSearchParams(
        (previous) => {
          const merged = { ...parseListState(previous), ...patch };
          if (!keepPage && patch.page === undefined) merged.page = 1;
          return applyListState(previous, merged);
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => update({ statuses: [], queue: "", q: "" }), [update]);

  return { state, update, clearFilters };
}
