import { CircleCheck, CircleX, Clock, LoaderCircle, Skull, type LucideIcon } from "lucide-react";
import type { JobStatus } from "../api/types";
import { cn } from "../lib/cn";
import { STATUS_LABELS } from "../lib/status";

// Status is always shown as icon + text, never colour alone.
const STATUS_STYLES: Record<JobStatus, { icon: LucideIcon; classes: string }> = {
  pending: {
    icon: Clock,
    classes: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  },
  running: {
    icon: LoaderCircle,
    classes: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  },
  succeeded: {
    icon: CircleCheck,
    classes: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  },
  failed: {
    icon: CircleX,
    classes: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  dead: {
    icon: Skull,
    classes: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
};

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const { icon: Icon, classes } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        classes,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
