import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSessionStore } from "@/stores/sessionStore";
import { ROLE } from "@/types/auth";

interface AuthGuardProps {
  allowedRoles?: ROLE[];
}

export default function AuthGuard({ allowedRoles }: AuthGuardProps) {
  const { user, sessionReady } = useSessionStore();
  const location = useLocation();

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated users to home
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <Outlet />;
}
