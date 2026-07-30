import { describe, expect, it } from "vitest";
import {
  type QuestionInput,
  validateBulkQuestionRecord,
  validateQuestionInput,
} from "./questionService";

const validQuestion: QuestionInput = {
  externalId: "history-magna-carta-001",
  categoryId: "category-id",
  prompt: "When was Magna Carta agreed?",
  options: ["1066", "1215", "1689", "1707"],
  correctIndex: 1,
  explanationMarkdown: "**Magna Carta** was agreed in 1215.",
  status: "draft",
};

describe("admin question validation", () => {
  it("accepts a complete typed question", () => {
    expect(validateQuestionInput(validQuestion)).toEqual([]);
  });

  it("rejects missing content and invalid identifiers", () => {
    const errors = validateQuestionInput({
      ...validQuestion,
      externalId: "Bad ID",
      prompt: "",
      options: ["", "1215", "1689", "1707"],
      correctIndex: 4,
      explanationMarkdown: "",
    });

    expect(errors.length).toBeGreaterThanOrEqual(5);
  });

  it("validates the documented bulk JSON structure", () => {
    expect(
      validateBulkQuestionRecord({
        external_id: "history-magna-carta-001",
        category_slug: "history",
        prompt: "When was Magna Carta agreed?",
        options: ["1066", "1215", "1689", "1707"],
        correct_index: 1,
        explanation_markdown: "Agreed in **1215**.",
        status: "published",
      }),
    ).toBe(true);

    expect(validateBulkQuestionRecord({ external_id: "incomplete" })).toBe(false);
  });
});
