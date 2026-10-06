import type { JobStatus } from "../api/types";
import { cn } from "../lib/cn";
import { STATUS_LABELS } from "../lib/status";
import { STATUS_STYLES } from "../lib/statusStyles";

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const { icon: Icon, classes } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        classes,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
