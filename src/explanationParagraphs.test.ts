import { describe, expect, it } from "vitest";
import { explanationParagraphs } from "./explanationParagraphs";
import { questions } from "./questions";

describe("explanationParagraphs", () => {
  it("splits Crown dependency explanations into clear paragraphs", () => {
    const question = questions.find((item) => item.prompt.includes("Crown dependencies"));

    expect(question).toBeDefined();
    const paragraphs = explanationParagraphs(question!.explanation);

    expect(paragraphs[0]).toContain("Channel Islands and the Isle of Man");
    expect(paragraphs[1]).toContain("overseas territories");
    expect(paragraphs[2]).toContain("Scotland and Wales");
    expect(paragraphs).toHaveLength(3);
  });

  it("keeps single-paragraph explanations intact", () => {
    expect(explanationParagraphs("One clear sentence.")).toEqual(["One clear sentence."]);
  });
});
