import { FlaskConical } from "lucide-react";
import { Link, useLocation } from "react-router";
import { getMockMode } from "../mocks/mode";
import { focusRing } from "./Button";
import { cn } from "../lib/cn";

const DESCRIPTIONS = {
  slow: "every call takes 2 s",
  errors: "every call returns 500",
  flaky: "30% of calls return 500, 5% return 429",
} as const;

/**
 * The mock mode is remembered for the tab, so say so when it is not `normal`:
 * otherwise a plain URL after `?mock=errors` looks like a broken app.
 */
export function MockModeBanner() {
  const location = useLocation(); // re-evaluate on navigation
  const mode = getMockMode();
  if (mode === "normal") return null;

  const params = new URLSearchParams(location.search);
  params.set("mock", "normal");

  return (
    <div className="border-b border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <p className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-1.5 text-sm">
        <FlaskConical className="size-4" aria-hidden="true" />
        <span>
          Mock mode <strong>{mode}</strong>: {DESCRIPTIONS[mode]}.
        </span>
        <Link
          to={`${location.pathname}?${params.toString()}`}
          className={cn("rounded font-medium underline", focusRing)}
        >
          Switch back to normal
        </Link>
      </p>
    </div>
  );
}
