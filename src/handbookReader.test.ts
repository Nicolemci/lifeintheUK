import { describe, expect, it } from "vitest";
import handbook from "../public/handbook-pages.json";

describe("full handbook reader data", () => {
  it("contains all 98 pages from the uploaded PDF", () => {
    expect(handbook.pages).toHaveLength(98);
    expect(handbook.pages[0].page).toBe(1);
    expect(handbook.pages.at(-1)?.page).toBe(98);
  });

  it("includes material from throughout the handbook", () => {
    const text = handbook.pages.map((page) => page.text).join("\n");

    expect(text).toContain("The values and principles of the UK");
    expect(text).toContain("Magna Carta");
    expect(text).toContain("A modern, thriving society");
    expect(text).toContain("The UK Government, the law and your role");
    expect(text).toContain("Key Material and Facts");
  });
});
