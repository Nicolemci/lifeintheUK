import { describe, expect, it } from "vitest";
import {
  normalizeMockTestHistoryRow,
  normalizeProgressSummary,
} from "./ProgressContext";

describe("Supabase progress summaries", () => {
  it("normalizes PostgreSQL numeric values and wrong-question IDs", () => {
    expect(
      normalizeProgressSummary({
        total_questions_answered: "25",
        correct_answers: "20",
        accuracy_percentage: 80,
        mock_tests_completed: "3",
        mock_score_total: "225",
        average_score: "75",
        best_score: 88,
        wrong_question_ids: ["history-001", "government-003"],
      }),
    ).toEqual({
      totalQuestionsAnswered: 25,
      correctAnswers: 20,
      accuracyPercentage: 80,
      mockTestsCompleted: 3,
      mockScoreTotal: 225,
      averageScore: 75,
      bestScore: 88,
      wrongQuestionIds: ["history-001", "government-003"],
    });
  });

  it("returns zero metrics for a new user", () => {
    expect(normalizeProgressSummary(null)).toEqual({
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      accuracyPercentage: 0,
      mockTestsCompleted: 0,
      mockScoreTotal: 0,
      averageScore: 0,
      bestScore: 0,
      wrongQuestionIds: [],
    });
  });

  it("normalizes cross-device mock-test history", () => {
    expect(
      normalizeMockTestHistoryRow({
        id: "42",
        score: "18",
        percentage: "75",
        completed_at: "2026-07-28T16:30:00.000Z",
        duration_seconds: "1234",
      }),
    ).toEqual({
      id: 42,
      score: 18,
      percentage: 75,
      completedAt: "2026-07-28T16:30:00.000Z",
      durationSeconds: 1234,
    });
  });
});
