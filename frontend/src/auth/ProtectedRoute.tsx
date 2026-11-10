import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/Spinner";
import { useAuth } from "./useAuth";

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="page-center">
        <Spinner label="Restoring your session" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
