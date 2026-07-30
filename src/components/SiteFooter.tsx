import { Link } from "react-router-dom";

const footerLinks = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/refund-policy", label: "Refund Policy" },
  { to: "/cookie-policy", label: "Cookie Policy" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span aria-hidden="true">🇬🇧</span>
          <div>
            <strong>Life in the UK Prep</strong>
            <p>Accessible, affordable and effective test preparation.</p>
          </div>
        </div>
        <nav aria-label="Legal and company information">
          {footerLinks.map((link) => (
            <Link to={link.to} key={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-footer-meta">
          <a href="mailto:support@lifeintheukprep.co">support@lifeintheukprep.co</a>
          <small>© {new Date().getFullYear()} Life in the UK Prep</small>
        </div>
      </div>
    </footer>
  );
}
