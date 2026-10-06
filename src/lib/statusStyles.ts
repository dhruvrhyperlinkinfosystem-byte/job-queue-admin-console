import { CircleCheck, CircleX, Clock, LoaderCircle, Skull, type LucideIcon } from "lucide-react";
import type { JobStatus } from "../api/types";

// Status is always shown as icon + text, never colour alone.
export const STATUS_STYLES: Record<JobStatus, { icon: LucideIcon; classes: string }> = {
  pending: {
    icon: Clock,
    classes:
      "bg-slate-100 text-slate-800 ring-slate-300/70 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  },
  running: {
    icon: LoaderCircle,
    classes:
      "bg-blue-50 text-blue-900 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900",
  },
  succeeded: {
    icon: CircleCheck,
    classes:
      "bg-green-50 text-green-900 ring-green-200 dark:bg-green-950 dark:text-green-200 dark:ring-green-900",
  },
  failed: {
    icon: CircleX,
    classes:
      "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
  },
  dead: {
    icon: Skull,
    classes:
      "bg-red-50 text-red-900 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900",
  },
};
