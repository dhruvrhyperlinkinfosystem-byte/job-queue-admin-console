import { Route, Routes } from "react-router";
import { RequireAuth } from "./app/RequireAuth";
import { useTheme } from "./hooks/useTheme";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SignInPage } from "./pages/SignInPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { JobsPage } from "./pages/JobsPage";
import { QueuesPage } from "./pages/QueuesPage";

export default function App() {
  useTheme();
  return (
    <>
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route element={<RequireAuth />}>
          <Route index element={<QueuesPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
