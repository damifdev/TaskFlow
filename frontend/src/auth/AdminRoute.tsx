import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

/** Must be nested inside ProtectedRoute, which guarantees a loaded user. */
export function AdminRoute() {
  const { user } = useAuth();
  return user?.role === "Admin" ? <Outlet /> : <Navigate to="/" replace />;
}
