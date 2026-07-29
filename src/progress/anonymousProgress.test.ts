import { describe, expect, it } from "vitest";
import {
  addAnonymousAnswer,
  addAnonymousMockTest,
  ANONYMOUS_PROGRESS_STORAGE_KEY,
  clearAnonymousProgress,
  loadAnonymousProgress,
  saveAnonymousProgress,
  summarizeAnonymousProgress,
  type AnonymousProgress,
} from "./anonymousProgress";

function emptyProgress(): AnonymousProgress {
  return {
    version: 1,
    migrationId: "7b26ba2e-98f4-4d79-a523-7f31e16cb6f4",
    answers: [],
    mockTests: [],
  };
}

describe("anonymous onboarding progress", () => {
  it("persists progress in browser storage", () => {
    const progress = addAnonymousAnswer(emptyProgress(), {
      questionId: "history-001",
      correct: false,
      answeredAt: "2026-07-29T15:00:00.000Z",
    });

    saveAnonymousProgress(progress, localStorage);
    expect(loadAnonymousProgress(localStorage)).toEqual(progress);

    clearAnonymousProgress(localStorage);
    expect(localStorage.getItem(ANONYMOUS_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("tracks five completed free mock tests locally", () => {
    let progress = emptyProgress();

    for (let index = 0; index < 5; index += 1) {
      progress = addAnonymousMockTest(progress, {
        localId: index + 1,
        score: 18,
        percentage: 75,
        completedAt: `2026-07-2${index + 1}T12:00:00.000Z`,
        durationSeconds: 1200,
      });
    }

    expect(summarizeAnonymousProgress(progress).mockTestsCompleted).toBe(5);
    expect(summarizeAnonymousProgress(progress).averageScore).toBe(75);
  });

  it("uses the latest answer when reconstructing wrong questions", () => {
    let progress = addAnonymousAnswer(emptyProgress(), {
      questionId: "history-001",
      correct: false,
      answeredAt: "2026-07-29T10:00:00.000Z",
    });
    progress = addAnonymousAnswer(progress, {
      questionId: "history-001",
      correct: true,
      answeredAt: "2026-07-29T11:00:00.000Z",
    });

    expect(summarizeAnonymousProgress(progress)).toMatchObject({
      totalQuestionsAnswered: 2,
      correctAnswers: 1,
      accuracyPercentage: 50,
      wrongQuestionIds: [],
    });
  });
});
