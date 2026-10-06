import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "../lib/cn";
import { useToastStore, type ToastKind } from "../stores/toastStore";
import { focusRing } from "./Button";

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const LABELS: Record<ToastKind, string> = { success: "Success", error: "Error", info: "Notice" };
const STYLES: Record<ToastKind, string> = {
  success: "border-green-300 dark:border-green-800",
  error: "border-red-300 dark:border-red-800",
  info: "border-slate-300 dark:border-slate-700",
};

export function ToastRegion() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white p-3 text-sm shadow-lg dark:bg-slate-900",
              STYLES[toast.kind],
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="flex-1">
              <span className="sr-only">{LABELS[toast.kind]}: </span>
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className={cn("rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800", focusRing)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
