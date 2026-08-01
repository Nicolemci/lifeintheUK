import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("generate-seo-files", () => {
  it("writes sitemap.xml and robots.txt for the public site", () => {
    const result = spawnSync(process.execPath, ["scripts/generate-seo-files.mjs"], {
      cwd: root,
      env: { ...process.env, VITE_SITE_URL: "https://lifeintheukprep.co" },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);

    const sitemap = readFileSync(join(root, "public/sitemap.xml"), "utf8");
    const robots = readFileSync(join(root, "public/robots.txt"), "utf8");

    expect(sitemap).toContain("<loc>https://lifeintheukprep.co/</loc>");
    expect(sitemap).toContain("<loc>https://lifeintheukprep.co/about</loc>");
    expect(sitemap).toContain("<loc>https://lifeintheukprep.co/privacy</loc>");
    expect(robots).toContain("Sitemap: https://lifeintheukprep.co/sitemap.xml");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api/");
  });
});
