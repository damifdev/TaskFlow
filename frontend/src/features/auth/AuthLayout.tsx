import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="brand brand-large">
          <span className="brand-mark" aria-hidden="true">
            ✓
          </span>
          TaskFlow
        </p>
        <h1>{title}</h1>
        <p className="muted auth-subtitle">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </main>
  );
}
