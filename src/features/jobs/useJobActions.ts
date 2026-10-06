import { useCallback, useState } from "react";
import { api } from "../../api/endpoints";
import { isApiError } from "../../api/errors";
import type { Job } from "../../api/types";
import { useToastStore } from "../../stores/toastStore";

export function actionFor(job: Pick<Job, "status">): "retry" | "replay" | null {
  if (job.status === "failed") return "retry";
  if (job.status === "dead") return "replay";
  return null;
}

/** User-facing text for a failed single-job action. */
export function describeActionError(error: unknown, jobId: string): string {
  if (!isApiError(error)) return "Something went wrong. Please try again.";
  switch (error.status) {
    case 409:
      return `${error.message}. The job has been refreshed.`;
    case 404:
      return `Job ${jobId} no longer exists.`;
    case 429:
      return error.retryAfterSeconds !== null
        ? `Too many requests. Try again in ${error.retryAfterSeconds}s.`
        : "Too many requests. Try again shortly.";
    default:
      return error.message;
  }
}

/**
 * Retry / replay one job. Updates are confirmed, not optimistic: the UI only changes once the
 * server answers, then `onChanged` reloads so the screen shows server state (including after a 409).
 */
export function useJobActions(onChanged: () => void) {
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

  const run = useCallback(
    async (job: Pick<Job, "id" | "status">) => {
      const action = actionFor(job);
      if (!action) return;
      setBusyIds((ids) => new Set(ids).add(job.id));
      const toast = useToastStore.getState();
      try {
        if (action === "retry") await api.retryJob(job.id);
        else await api.replayJob(job.id);
        toast.push("success", `Job ${job.id} is pending again.`);
        onChanged();
      } catch (error) {
        toast.push("error", describeActionError(error, job.id));
        if (isApiError(error) && (error.status === 409 || error.status === 404)) onChanged();
      } finally {
        setBusyIds((ids) => {
          const next = new Set(ids);
          next.delete(job.id);
          return next;
        });
      }
    },
    [onChanged],
  );

  return { busyIds, run };
}
