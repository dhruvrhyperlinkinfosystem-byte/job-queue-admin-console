import { RotateCcw } from "lucide-react";
import type { Job } from "../../api/types";
import { Button } from "../../components/Button";
import { actionFor } from "./useJobActions";

interface ActionButtonProps {
  job: Pick<Job, "id" | "status">;
  busy: boolean;
  onRun: (job: Pick<Job, "id" | "status">) => void;
}

/** Retry for failed jobs, Replay for dead ones, nothing otherwise. */
export function ActionButton({ job, busy, onRun }: ActionButtonProps) {
  const action = actionFor(job);
  if (!action) return null;
  const label = action === "retry" ? "Retry" : "Replay";
  return (
    <Button size="sm" loading={busy} onClick={() => onRun(job)} aria-label={`${label} ${job.id}`}>
      {!busy && <RotateCcw className="size-3.5" aria-hidden="true" />}
      {label}
    </Button>
  );
}
