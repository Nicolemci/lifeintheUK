export const ANONYMOUS_PROGRESS_STORAGE_KEY = "life-in-the-uk-anonymous-progress-v1";

export type AnonymousAnswer = {
  questionId: string;
  correct: boolean;
  answeredAt: string;
};

export type AnonymousMockTest = {
  localId: number;
  score: number;
  percentage: number;
  completedAt: string;
  durationSeconds: number;
};

export type AnonymousProgress = {
  version: 1;
  migrationId: string;
  answers: AnonymousAnswer[];
  mockTests: AnonymousMockTest[];
};

export type AnonymousProgressSummary = {
  totalQuestionsAnswered: number;
  correctAnswers: number;
  accuracyPercentage: number;
  mockTestsCompleted: number;
  mockScoreTotal: number;
  averageScore: number;
  bestScore: number;
  wrongQuestionIds: string[];
};

const emptyAnonymousProgress: AnonymousProgress = {
  version: 1,
  migrationId: "00000000-0000-4000-8000-000000000000",
  answers: [],
  mockTests: [],
};

function createMigrationId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function defaultStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function loadAnonymousProgress(
  storage: Storage | null = defaultStorage(),
): AnonymousProgress {
  if (!storage) {
    return emptyAnonymousProgress;
  }

  try {
    const raw = storage.getItem(ANONYMOUS_PROGRESS_STORAGE_KEY);

    if (!raw) {
      return {
        ...emptyAnonymousProgress,
        migrationId: createMigrationId(),
      };
    }

    const parsed = JSON.parse(raw) as Partial<AnonymousProgress>;
    return {
      version: 1,
      migrationId:
        typeof parsed.migrationId === "string" ? parsed.migrationId : createMigrationId(),
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      mockTests: Array.isArray(parsed.mockTests) ? parsed.mockTests : [],
    };
  } catch {
    return {
      ...emptyAnonymousProgress,
      migrationId: createMigrationId(),
    };
  }
}

export function saveAnonymousProgress(
  progress: AnonymousProgress,
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) {
    return;
  }

  storage.setItem(ANONYMOUS_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function clearAnonymousProgress(
  storage: Storage | null = defaultStorage(),
): void {
  storage?.removeItem(ANONYMOUS_PROGRESS_STORAGE_KEY);
}

export function addAnonymousAnswer(
  progress: AnonymousProgress,
  answer: AnonymousAnswer,
): AnonymousProgress {
  return {
    ...progress,
    answers: [...progress.answers, answer].slice(-5000),
  };
}

export function addAnonymousMockTest(
  progress: AnonymousProgress,
  mockTest: Omit<AnonymousMockTest, "localId"> & { localId?: number },
): AnonymousProgress {
  return {
    ...progress,
    mockTests: [
      {
        ...mockTest,
        localId: mockTest.localId ?? Date.now(),
      },
      ...progress.mockTests,
    ],
  };
}

export function summarizeAnonymousProgress(
  progress: AnonymousProgress,
): AnonymousProgressSummary {
  const totalQuestionsAnswered = progress.answers.length;
  const correctAnswers = progress.answers.filter((answer) => answer.correct).length;
  const mockTestsCompleted = progress.mockTests.length;
  const mockScoreTotal = progress.mockTests.reduce(
    (total, mockTest) => total + mockTest.percentage,
    0,
  );
  const latestAnswers = new Map<string, AnonymousAnswer>();

  progress.answers.forEach((answer) => {
    const current = latestAnswers.get(answer.questionId);

    if (!current || current.answeredAt <= answer.answeredAt) {
      latestAnswers.set(answer.questionId, answer);
    }
  });

  return {
    totalQuestionsAnswered,
    correctAnswers,
    accuracyPercentage:
      totalQuestionsAnswered === 0
        ? 0
        : Math.round((correctAnswers / totalQuestionsAnswered) * 100),
    mockTestsCompleted,
    mockScoreTotal,
    averageScore:
      mockTestsCompleted === 0 ? 0 : Math.round(mockScoreTotal / mockTestsCompleted),
    bestScore:
      mockTestsCompleted === 0
        ? 0
        : Math.max(...progress.mockTests.map((mockTest) => mockTest.percentage)),
    wrongQuestionIds: Array.from(latestAnswers.values())
      .filter((answer) => !answer.correct)
      .map((answer) => answer.questionId)
      .sort(),
  };
}
