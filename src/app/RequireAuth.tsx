import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "../stores/authStore";
import { AppLayout } from "./AppLayout";

export function RequireAuth() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  if (!token) return <Navigate to="/signin" replace state={{ from: location }} />;
  return <AppLayout />;
}
