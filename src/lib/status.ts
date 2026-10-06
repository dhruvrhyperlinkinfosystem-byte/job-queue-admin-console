import type { JobStatus } from "../api/types";

export const STATUS_LABELS: Record<JobStatus, string> = {
  pending: "Pending",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  dead: "Dead",
};
