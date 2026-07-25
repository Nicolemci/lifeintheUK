import { describe, expect, it } from "vitest";
import { questions } from "./questions";
import { buildStudyGuide } from "./handbookStudyGuide";

describe("structured handbook study guide", () => {
  it("organises the key material into detailed sections", () => {
    const sections = buildStudyGuide(questions);

    expect(sections.length).toBeGreaterThanOrEqual(14);
    expect(sections.some((section) => section.title.includes("Values"))).toBe(true);
    expect(sections.some((section) => section.title.includes("Middle Ages"))).toBe(true);
    expect(sections.some((section) => section.title.includes("Tudors"))).toBe(true);
    expect(sections.some((section) => section.title.includes("Government"))).toBe(true);
  });

  it("covers every question-bank fact exactly once", () => {
    const sections = buildStudyGuide(questions);
    const factIds = sections.flatMap((section) => section.facts.map((fact) => fact.id));

    expect(factIds).toHaveLength(questions.length);
    expect(new Set(factIds).size).toBe(questions.length);
  });

  it("includes key dates, people, wars and laws", () => {
    const guideText = buildStudyGuide(questions)
      .flatMap((section) => section.facts.flatMap((fact) => [fact.heading, fact.detail]))
      .join("\n");

    expect(guideText).toContain("1215");
    expect(guideText).toContain("Florence Nightingale");
    expect(guideText).toContain("Battle of Britain");
    expect(guideText).toContain("Bill of Rights");
  });
});
