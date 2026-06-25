import { describe, expect, it } from "vitest";
import type { Question } from "./questions";
import {
  PASS_PERCENTAGE,
  calculateScore,
  chooseQuestions,
  createAnswerMap,
  formatTime,
  questionsForTopic,
} from "./quiz";

const sampleQuestions: Question[] = [
  {
    id: "one",
    topicId: "values",
    topic: "Values",
    prompt: "Question one",
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    explanation: "Explanation one",
  },
  {
    id: "two",
    topicId: "history",
    topic: "History",
    prompt: "Question two",
    options: ["A", "B", "C", "D"],
    correctIndex: 1,
    explanation: "Explanation two",
  },
  {
    id: "three",
    topicId: "values",
    topic: "Values",
    prompt: "Question three",
    options: ["A", "B", "C", "D"],
    correctIndex: 2,
    explanation: "Explanation three",
  },
];

describe("quiz helpers", () => {
  it("limits selected questions to the requested count", () => {
    const chosen = chooseQuestions(sampleQuestions, 2, () => 0.5);

    expect(chosen).toHaveLength(2);
  });

  it("does not duplicate questions when more are requested than available", () => {
    const chosen = chooseQuestions(sampleQuestions, 10, () => 0.5);

    expect(chosen).toHaveLength(sampleQuestions.length);
    expect(new Set(chosen.map((question) => question.id)).size).toBe(sampleQuestions.length);
  });

  it("filters practice questions by topic", () => {
    const valuesQuestions = questionsForTopic(sampleQuestions, "values");

    expect(valuesQuestions.map((question) => question.id)).toEqual(["one", "three"]);
  });

  it("calculates score, pass status, and wrong question ids", () => {
    const answers = {
      one: 0,
      two: 3,
      three: 2,
    };

    const score = calculateScore(sampleQuestions, answers);

    expect(PASS_PERCENTAGE).toBe(75);
    expect(score.correct).toBe(2);
    expect(score.total).toBe(3);
    expect(score.percentage).toBe(67);
    expect(score.requiredCorrect).toBe(3);
    expect(score.passed).toBe(false);
    expect(score.wrongQuestionIds).toEqual(["two"]);
  });

  it("creates an unanswered answer map", () => {
    expect(createAnswerMap(sampleQuestions)).toEqual({
      one: undefined,
      two: undefined,
      three: undefined,
    });
  });

  it("formats countdown values for display", () => {
    expect(formatTime(2700)).toBe("45:00");
    expect(formatTime(61)).toBe("1:01");
    expect(formatTime(-4)).toBe("0:00");
  });
});
