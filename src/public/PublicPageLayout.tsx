import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type PublicPageLayoutProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
  updatedAt?: string;
};

export default function PublicPageLayout({
  eyebrow,
  title,
  introduction,
  children,
  updatedAt,
}: PublicPageLayoutProps) {
  return (
    <main className="public-page">
      <nav className="public-nav card" aria-label="Public website navigation">
        <Link className="public-brand" to="/">
          <span aria-hidden="true">🇬🇧</span>
          Life in the UK Prep
        </Link>
        <div>
          <Link to="/">Study</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link className="secondary-button" to="/login">
            Log in
          </Link>
        </div>
      </nav>

      <header className="public-page-hero card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{introduction}</p>
        {updatedAt ? <time dateTime={new Date().toISOString()}>{updatedAt}</time> : null}
      </header>

      <div className="public-page-content">{children}</div>
    </main>
  );
}
