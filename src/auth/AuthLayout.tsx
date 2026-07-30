import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link className="british-kicker auth-brand" to="/">
          Life in the UK test
        </Link>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      <section className="card auth-card">
        <p className="eyebrow">{eyebrow}</p>
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </section>
    </main>
  );
}
