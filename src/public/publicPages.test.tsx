import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SiteFooter from "../components/SiteFooter";
import PrivacyPage from "./PrivacyPage";
import { privacySections, refundSections, termsSections } from "./legalContent";

describe("public information pages", () => {
  it("includes all required footer links", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );

    [
      "/privacy",
      "/terms",
      "/refund-policy",
      "/cookie-policy",
      "/about",
      "/contact",
    ].forEach((route) => expect(markup).toContain(`href="${route}"`));
  });

  it("contains the required legal statements", () => {
    const privacyText = JSON.stringify(privacySections);
    const termsText = JSON.stringify(termsSections);
    const refundText = JSON.stringify(refundSections);

    expect(privacyText).toContain("UK GDPR");
    expect(privacyText).toContain("Supabase");
    expect(privacyText).toContain("Stripe");
    expect(privacyText).toContain("Vercel");
    expect(termsText).toContain("laws of England and Wales");
    expect(refundText).toContain("duplicate payment");
  });

  it("sets a unique title and meta description", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const originalTitle = document.title;

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PrivacyPage />
        </MemoryRouter>,
      );
    });

    expect(document.title).toBe("Privacy Policy | Life in the UK Prep");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toContain(
      "UK GDPR",
    );

    await act(async () => root.unmount());
    expect(document.title).toBe(originalTitle);
  });
});
