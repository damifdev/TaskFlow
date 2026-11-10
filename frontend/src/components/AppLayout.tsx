import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { UserMenu } from "./UserMenu";

export function AppLayout() {
  const { user } = useAuth();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="container app-header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              ✓
            </span>
            TaskFlow
          </Link>
          <nav aria-label="Main" className="main-nav">
            <NavLink to="/" end>
              Projects
            </NavLink>
            {user?.role === "Admin" && <NavLink to="/admin">Admin</NavLink>}
          </nav>
          <UserMenu />
        </div>
      </header>
      <main id="main" className="container main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
