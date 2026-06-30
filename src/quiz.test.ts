import { describe, expect, it } from "vitest";
import { questions, type Question } from "./questions";
import {
  MINIMUM_NUMBERED_MOCK_TESTS,
  PASS_PERCENTAGE,
  calculateScore,
  chooseQuestions,
  createAnswerMap,
  createMockTestSets,
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

  it("creates enough mock test sets to cover every question", () => {
    const sets = createMockTestSets(sampleQuestions, 2);
    const coveredIds = new Set(sets.flatMap((set) => set.questions.slice(0, set.coveredQuestionCount).map((question) => question.id)));

    expect(sets).toHaveLength(2);
    expect(sets[0].questions.map((question) => question.id)).toEqual(["one", "two"]);
    expect(sets[1].questions.map((question) => question.id)).toEqual(["three", "one"]);
    expect(coveredIds).toEqual(new Set(["one", "two", "three"]));
  });

  it("does not pad a mock test when there are fewer questions than the target size", () => {
    const sets = createMockTestSets(sampleQuestions, 24);

    expect(sets).toHaveLength(1);
    expect(sets[0].questions).toHaveLength(sampleQuestions.length);
    expect(sets[0].coveredQuestionCount).toBe(sampleQuestions.length);
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

  it("keeps the full question bank valid", () => {
    const ids = new Set(questions.map((question) => question.id));

    expect(questions.length).toBeGreaterThan(100);
    expect(ids.size).toBe(questions.length);
    questions.forEach((question) => {
      expect(question.options).toHaveLength(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
    });
  });

  it("creates full-bank mock tests that cover every stored question at least once", () => {
    const sets = createMockTestSets(questions);
    const coveredIds = new Set(sets.flatMap((set) => set.questions.slice(0, set.coveredQuestionCount).map((question) => question.id)));

    expect(sets.length).toBe(Math.ceil(questions.length / 24));
    expect(sets.slice(0, -1).every((set) => set.questions.length === 24)).toBe(true);
    expect(sets.at(-1)?.questions.length).toBe(24);
    expect(coveredIds.size).toBe(questions.length);
  });

  it("creates more than 10 full numbered mock tests covering every stored question", () => {
    const sets = createMockTestSets(questions, 24, MINIMUM_NUMBERED_MOCK_TESTS);
    const coveredIds = new Set(sets.flatMap((set) => set.questions.slice(0, set.coveredQuestionCount).map((question) => question.id)));

    expect(sets.length).toBeGreaterThan(10);
    expect(sets).toHaveLength(MINIMUM_NUMBERED_MOCK_TESTS);
    expect(sets.every((set) => set.questions.length === 24)).toBe(true);
    expect(coveredIds.size).toBe(questions.length);
  });
});
