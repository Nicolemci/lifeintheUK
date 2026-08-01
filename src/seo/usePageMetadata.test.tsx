import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { usePageMetadata } from "./usePageMetadata";

function MetadataProbe() {
  usePageMetadata({
    title: "About Life in the UK Prep",
    description: "Learn why Life in the UK Prep was created for citizenship test practice.",
    path: "/about",
  });

  return <h1>About</h1>;
}

describe("usePageMetadata", () => {
  it("sets title, description, canonical, Open Graph and Twitter tags", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/about"]}>
          <Routes>
            <Route path="/about" element={<MetadataProbe />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(document.title).toBe("About Life in the UK Prep | Life in the UK Prep");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toContain(
      "citizenship test practice",
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://lifeintheukprep.co/about",
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toContain(
      "About Life in the UK Prep",
    );
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe(
      "summary_large_image",
    );
    expect(document.querySelector('script[data-seo-jsonld="webpage"]')?.textContent).toContain(
      "WebPage",
    );

    await act(async () => root.unmount());
  });
});
