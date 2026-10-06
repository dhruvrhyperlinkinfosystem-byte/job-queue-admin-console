import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "../lib/cn";
import { useToastStore, type ToastKind } from "../stores/toastStore";
import { focusRing } from "./Button";

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const LABELS: Record<ToastKind, string> = { success: "Success", error: "Error", info: "Notice" };
const STYLES: Record<ToastKind, string> = {
  success: "border-l-green-600 dark:border-l-green-400",
  error: "border-l-red-600 dark:border-l-red-400",
  info: "border-l-slate-500 dark:border-l-slate-400",
};
const ICON_TONES: Record<ToastKind, string> = {
  success: "text-green-700 dark:text-green-300",
  error: "text-red-700 dark:text-red-300",
  info: "text-slate-700 dark:text-slate-300",
};

export function ToastRegion({ className }: { className?: string }) {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <div
      role="region"
      aria-label="Notifications"
      className={cn(
        "pointer-events-none flex w-full flex-col items-end gap-2 sm:w-auto sm:min-w-[22rem]",
        className,
      )}
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-l-4 border-slate-200 bg-white p-3.5 text-sm shadow-float dark:border-slate-800 dark:bg-slate-900",
              STYLES[toast.kind],
            )}
          >
            <Icon
              className={cn("mt-0.5 size-4 shrink-0", ICON_TONES[toast.kind])}
              aria-hidden="true"
            />
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
