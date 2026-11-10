import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "./Button";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="user-menu-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden="true">
          {user.displayName.charAt(0).toUpperCase()}
        </span>
        <span className="user-menu-name">{user.displayName}</span>
        <span className="chip chip-role">{user.role}</span>
      </button>
      {open && (
        <div id={menuId} className="user-menu-panel">
          <p className="user-menu-email">{user.email}</p>
          <Button variant="secondary" loading={signingOut} onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}
