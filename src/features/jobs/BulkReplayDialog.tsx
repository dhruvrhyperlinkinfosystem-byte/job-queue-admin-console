import { useState } from "react";
import { api } from "../../api/endpoints";
import { isApiError } from "../../api/errors";
import type { BulkReplayResponse } from "../../api/types";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { pluralize } from "../../lib/format";

interface BulkReplayDialogProps {
  ids: string[];
  open: boolean;
  onClose: () => void;
  /** Called with the server's per-job outcome once the request completes. */
  onFinished: (result: BulkReplayResponse) => void;
}

type Phase =
  | { kind: "confirm" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: BulkReplayResponse };

export function BulkReplayDialog(props: BulkReplayDialogProps) {
  // Remount on open so each use starts from the confirmation step.
  return props.open ? <DialogBody {...props} /> : null;
}

function DialogBody({ ids: initialIds, onClose, onFinished }: BulkReplayDialogProps) {
  // Snapshot: the selection behind the dialog changes once the replay completes.
  const [ids] = useState(initialIds);
  const [phase, setPhase] = useState<Phase>({ kind: "confirm" });
  const count = pluralize(ids.length, "dead job");

  async function submit() {
    setPhase({ kind: "submitting" });
    try {
      const result = await api.replayJobs(ids);
      setPhase({ kind: "done", result });
      onFinished(result);
    } catch (error) {
      const message = isApiError(error)
        ? error.status === 429 && error.retryAfterSeconds !== null
          ? `Too many requests. Try again in ${error.retryAfterSeconds}s.`
          : error.message
        : "Something went wrong. Please try again.";
      setPhase({ kind: "error", message });
    }
  }

  const busy = phase.kind === "submitting";

  return (
    <Dialog
      open
      onClose={onClose}
      disableClose={busy}
      title={phase.kind === "done" ? "Replay results" : `Replay ${count}?`}
    >
      {(phase.kind === "confirm" || phase.kind === "submitting" || phase.kind === "error") && (
        <>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            {pluralize(ids.length, "dead job")} will be moved back to pending, and their attempt
            counts reset to 0.
          </p>
          {phase.kind === "error" && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">
              {phase.message}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              key={phase.kind === "error" ? "retry" : "replay"}
              variant="primary"
              onClick={submit}
              loading={busy}
              autoFocus={phase.kind === "error"}
            >
              {phase.kind === "error" ? "Try again" : `Replay ${ids.length}`}
            </Button>
          </div>
        </>
      )}

      {phase.kind === "done" && (
        <>
          <p role="status" className="mt-2 text-sm">
            Replayed {phase.result.replayed.length} of {ids.length}.
            {phase.result.failed.length > 0 &&
              ` ${phase.result.failed.length} could not be replayed:`}
          </p>
          {phase.result.failed.length > 0 && (
            <ul className="mt-3 flex max-h-60 flex-col gap-2 overflow-y-auto text-sm">
              {phase.result.failed.map((failure) => (
                <li
                  key={failure.id}
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/40"
                >
                  <span className="font-mono">{failure.id}</span>: {failure.error.message}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={onClose} autoFocus>
              Close
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
