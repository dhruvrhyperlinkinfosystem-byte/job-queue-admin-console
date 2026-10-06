import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/Button";
import { PAGE_SIZE_OPTIONS } from "./listParams";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="page-size" className="text-sm">
          Rows per page
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="min-h-10 rounded-md border border-slate-400 bg-white px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-500 dark:bg-slate-900 dark:focus-visible:outline-indigo-300"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <span className="text-sm tabular-nums" aria-live="polite">
          Page {page} of {pageCount}
        </span>
        <Button onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
