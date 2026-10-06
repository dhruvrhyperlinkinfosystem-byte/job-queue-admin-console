import { Layers } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Button } from "../components/Button";
import { ThemeToggle } from "../components/ThemeToggle";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { validateToken } from "../lib/validation";
import { useAuthStore } from "../stores/authStore";

function redirectTarget(state: unknown): string {
  if (typeof state === "object" && state !== null && "from" in state) {
    const from = state.from;
    if (typeof from === "object" && from !== null && "pathname" in from) {
      const { pathname, search } = from as { pathname: string; search?: string };
      return `${pathname}${search ?? ""}`;
    }
  }
  return "/";
}

export function SignInPage() {
  useDocumentTitle("Sign in");
  const token = useAuthStore((state) => state.token);
  const notice = useAuthStore((state) => state.notice);
  const signIn = useAuthStore((state) => state.signIn);
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (token) return <Navigate to={redirectTarget(location.state)} replace />;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validateToken(value);
    setError(problem);
    if (problem) return;
    signIn(value.trim());
    void navigate(redirectTarget(location.state), { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(60rem_30rem_at_50%_-10%,theme(colors.indigo.100),transparent)] dark:bg-[radial-gradient(60rem_30rem_at_50%_-10%,theme(colors.indigo.950),transparent)]">
      <div className="flex justify-end p-3">
        <ThemeToggle />
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 pb-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-float">
            <Layers className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold">Job Queue Admin</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sign in with an API token to manage queues and jobs.
          </p>
        </div>

        {notice && (
          <p
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100"
          >
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="card flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="token" className="text-sm font-medium">
              Access token
            </label>
            <input
              id="token"
              name="token"
              type="password"
              autoComplete="off"
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "token-error token-hint" : "token-hint"}
              className="field w-full"
            />
            {error && (
              <p id="token-error" className="text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
            <p id="token-hint" className="text-xs text-slate-600 dark:text-slate-400">
              Any non-empty token works in this demo. The token <code>expired</code> is rejected.
            </p>
          </div>
          <Button type="submit" variant="primary">
            Sign in
          </Button>
        </form>
      </main>
    </div>
  );
}
