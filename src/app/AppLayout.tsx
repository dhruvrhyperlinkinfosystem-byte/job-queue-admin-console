import { Layers, LogOut } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { Button } from "../components/Button";
import { MockModeBanner } from "../components/MockModeBanner";
import { ThemeToggle } from "../components/ThemeToggle";
import { cn } from "../lib/cn";
import { useAuthStore } from "../stores/authStore";
import { useSelectionStore } from "../stores/selectionStore";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-300",
    isActive
      ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-100"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  );

export function AppLayout() {
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-slate-950 focus:shadow-float dark:focus:bg-slate-900 dark:focus:text-white"
      >
        Skip to content
      </a>
      <MockModeBanner />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Layers className="size-4" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">Job Queue Admin</span>
          </div>
          <nav aria-label="Main" className="flex gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Queues
            </NavLink>
            <NavLink to="/jobs" className={navLinkClass}>
              Jobs
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={() => {
                useSelectionStore.getState().clear();
                signOut();
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 outline-none">
        <Outlet />
      </main>
    </div>
  );
}
