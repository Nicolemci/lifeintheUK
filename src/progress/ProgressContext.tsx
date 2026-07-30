import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  addAnonymousAnswer,
  addAnonymousMockTest,
  clearAnonymousProgress,
  loadAnonymousProgress,
  saveAnonymousProgress,
  summarizeAnonymousProgress,
  type AnonymousProgress,
} from "./anonymousProgress";

export type ProgressStats = {
  totalQuestionsAnswered: number;
  accuracyPercentage: number;
  mockTestsCompleted: number;
  averageScore: number;
  bestScore: number;
};

type ProgressState = ProgressStats & {
  correctAnswers: number;
  mockScoreTotal: number;
  wrongQuestionIds: string[];
};

type ProgressSummaryRow = {
  total_questions_answered: number | string | null;
  correct_answers: number | string | null;
  accuracy_percentage: number | string | null;
  mock_tests_completed: number | string | null;
  mock_score_total: number | string | null;
  average_score: number | string | null;
  best_score: number | string | null;
  wrong_question_ids: string[] | null;
};

export type SaveQuestionAnswerInput = {
  questionId: string;
  correct: boolean;
  answeredAt?: string;
};

export type SaveMockTestInput = {
  score: number;
  percentage: number;
  completedAt: string;
  durationSeconds: number;
};

export type MockTestHistoryItem = {
  id: number;
  score: number;
  percentage: number;
  completedAt: string;
  durationSeconds: number;
};

type MockTestHistoryRow = {
  id: number | string;
  score: number | string;
  percentage: number | string;
  completed_at: string;
  duration_seconds: number | string;
};

type ProgressContextValue = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  stats: ProgressStats;
  wrongQuestionIds: string[];
  mockTestHistory: MockTestHistoryItem[];
  refreshProgress: () => Promise<void>;
  saveQuestionAnswer: (input: SaveQuestionAnswerInput) => Promise<void>;
  saveMockTest: (input: SaveMockTestInput) => Promise<void>;
};

const emptyProgress: ProgressState = {
  totalQuestionsAnswered: 0,
  correctAnswers: 0,
  accuracyPercentage: 0,
  mockTestsCompleted: 0,
  mockScoreTotal: 0,
  averageScore: 0,
  bestScore: 0,
  wrongQuestionIds: [],
};

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

async function loadSupabaseClient() {
  const { getSupabaseClient } = await import("../lib/supabase");
  return getSupabaseClient();
}

function asNumber(value: number | string | null): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeMockTestHistoryRow(
  row: MockTestHistoryRow,
): MockTestHistoryItem {
  return {
    id: asNumber(row.id),
    score: asNumber(row.score),
    percentage: asNumber(row.percentage),
    completedAt: row.completed_at,
    durationSeconds: asNumber(row.duration_seconds),
  };
}

export function normalizeProgressSummary(row?: ProgressSummaryRow | null): ProgressState {
  if (!row) {
    return emptyProgress;
  }

  return {
    totalQuestionsAnswered: asNumber(row.total_questions_answered),
    correctAnswers: asNumber(row.correct_answers),
    accuracyPercentage: asNumber(row.accuracy_percentage),
    mockTestsCompleted: asNumber(row.mock_tests_completed),
    mockScoreTotal: asNumber(row.mock_score_total),
    averageScore: asNumber(row.average_score),
    bestScore: asNumber(row.best_score),
    wrongQuestionIds: row.wrong_question_ids ?? [],
  };
}

function progressStateFromAnonymous(progress: AnonymousProgress): ProgressState {
  return summarizeAnonymousProgress(progress);
}

function mockHistoryFromAnonymous(progress: AnonymousProgress): MockTestHistoryItem[] {
  return progress.mockTests.map((mockTest) => ({
    id: -mockTest.localId,
    score: mockTest.score,
    percentage: mockTest.percentage,
    completedAt: mockTest.completedAt,
    durationSeconds: mockTest.durationSeconds,
  }));
}

function applyAnswerToProgress(
  current: ProgressState,
  questionId: string,
  correct: boolean,
): ProgressState {
  const totalQuestionsAnswered = current.totalQuestionsAnswered + 1;
  const correctAnswers = current.correctAnswers + (correct ? 1 : 0);
  const wrongQuestionIds = new Set(current.wrongQuestionIds);

  if (correct) {
    wrongQuestionIds.delete(questionId);
  } else {
    wrongQuestionIds.add(questionId);
  }

  return {
    ...current,
    totalQuestionsAnswered,
    correctAnswers,
    accuracyPercentage: Math.round((correctAnswers / totalQuestionsAnswered) * 100),
    wrongQuestionIds: Array.from(wrongQuestionIds),
  };
}

function applyMockToProgress(current: ProgressState, percentage: number): ProgressState {
  const mockTestsCompleted = current.mockTestsCompleted + 1;
  const mockScoreTotal = current.mockScoreTotal + percentage;

  return {
    ...current,
    mockTestsCompleted,
    mockScoreTotal,
    averageScore: Math.round(mockScoreTotal / mockTestsCompleted),
    bestScore: Math.max(current.bestScore, percentage),
  };
}

export function ProgressProvider() {
  const { user, loading: authLoading } = useAuth();
  const [anonymousProgress, setAnonymousProgress] = useState<AnonymousProgress>(() =>
    loadAnonymousProgress(),
  );
  const [progress, setProgress] = useState<ProgressState>(() =>
    progressStateFromAnonymous(loadAnonymousProgress()),
  );
  const [loading, setLoading] = useState(true);
  const [savingCount, setSavingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mockTestHistory, setMockTestHistory] = useState<MockTestHistoryItem[]>([]);

  const refreshProgress = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      const localProgress = loadAnonymousProgress();
      setAnonymousProgress(localProgress);
      setProgress(progressStateFromAnonymous(localProgress));
      setMockTestHistory(mockHistoryFromAnonymous(localProgress));
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = await loadSupabaseClient();
      const localProgress = loadAnonymousProgress();

      if (localProgress.answers.length > 0 || localProgress.mockTests.length > 0) {
        const { error: migrationError } = await supabase.rpc(
          "migrate_anonymous_progress",
          {
            p_migration_id: localProgress.migrationId,
            p_answers: localProgress.answers,
            p_mock_tests: localProgress.mockTests.map(({ localId: _localId, ...mockTest }) => mockTest),
          },
        );

        if (migrationError) {
          throw migrationError;
        }

        clearAnonymousProgress();
        const clearedProgress = loadAnonymousProgress();
        setAnonymousProgress(clearedProgress);
      }

      const [summaryResult, historyResult] = await Promise.all([
        supabase.rpc("get_user_progress_summary"),
        supabase
          .from("mock_tests")
          .select("id, score, percentage, completed_at, duration_seconds")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false }),
      ]);

      if (summaryResult.error) {
        throw summaryResult.error;
      }

      if (historyResult.error) {
        throw historyResult.error;
      }

      const rows = (summaryResult.data ?? []) as ProgressSummaryRow[];
      setProgress(normalizeProgressSummary(rows[0]));
      setMockTestHistory(
        ((historyResult.data ?? []) as MockTestHistoryRow[]).map(
          normalizeMockTestHistoryRow,
        ),
      );
    } catch (summaryError) {
      const message =
        summaryError instanceof Error && summaryError.message.trim()
          ? summaryError.message
          : typeof summaryError === "object" &&
              summaryError !== null &&
              typeof (summaryError as { message?: unknown }).message === "string"
            ? String((summaryError as { message: string }).message)
            : "Unable to load your progress.";
      const normalized = message.toLowerCase();
      const schemaMissing =
        normalized.includes("schema cache") ||
        normalized.includes("pgrst205") ||
        normalized.includes("does not exist") ||
        normalized.includes("quiz_progress") ||
        normalized.includes("mock_tests") ||
        normalized.includes("migrate_anonymous_progress") ||
        normalized.includes("get_user_progress_summary");

      if (schemaMissing) {
        console.warn(
          "[progress] Supabase progress tables/RPCs are missing. Apply supabase/APPLY_ALL.sql, then refresh.",
          summaryError,
        );
        const localProgress = loadAnonymousProgress();
        setAnonymousProgress(localProgress);
        setProgress(progressStateFromAnonymous(localProgress));
        setMockTestHistory(mockHistoryFromAnonymous(localProgress));
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  const saveQuestionAnswer = useCallback(
    async ({ questionId, correct, answeredAt }: SaveQuestionAnswerInput) => {
      setSavingCount((count) => count + 1);
      setError(null);

      try {
        const answer = {
          questionId,
          correct,
          answeredAt: answeredAt ?? new Date().toISOString(),
        };

        if (!user) {
          setAnonymousProgress((current) => {
            const next = addAnonymousAnswer(current, answer);
            saveAnonymousProgress(next);
            return next;
          });
          setProgress((current) => applyAnswerToProgress(current, questionId, correct));
          return;
        }

        const supabase = await loadSupabaseClient();
        const { error: insertError } = await supabase.from("quiz_progress").insert({
          user_id: user.id,
          question_id: questionId,
          correct,
          answered_at: answer.answeredAt,
        });

        if (insertError) {
          throw insertError;
        }

        setProgress((current) => applyAnswerToProgress(current, questionId, correct));
      } catch (saveError) {
        const message =
          saveError instanceof Error ? saveError.message : "Unable to save your answer.";
        setError(message);
        throw new Error(message);
      } finally {
        setSavingCount((count) => Math.max(0, count - 1));
      }
    },
    [user],
  );

  const saveMockTest = useCallback(
    async ({
      score,
      percentage,
      completedAt,
      durationSeconds,
    }: SaveMockTestInput) => {
      setSavingCount((count) => count + 1);
      setError(null);

      try {
        if (!user) {
          const localMockTest = {
            localId: Date.now(),
            score,
            percentage,
            completedAt,
            durationSeconds,
          };
          setAnonymousProgress((current) => {
            const next = addAnonymousMockTest(current, localMockTest);
            saveAnonymousProgress(next);
            return next;
          });
          setMockTestHistory((currentHistory) => [
            {
              id: -localMockTest.localId,
              score,
              percentage,
              completedAt,
              durationSeconds,
            },
            ...currentHistory,
          ]);
          setProgress((current) => applyMockToProgress(current, percentage));
          return;
        }

        const supabase = await loadSupabaseClient();
        const { data: insertedRow, error: insertError } = await supabase
          .from("mock_tests")
          .insert({
            user_id: user.id,
            score,
            percentage,
            completed_at: completedAt,
            duration_seconds: durationSeconds,
          })
          .select("id, score, percentage, completed_at, duration_seconds")
          .single();

        if (insertError) {
          throw insertError;
        }

        if (!insertedRow) {
          throw new Error("Supabase did not return the saved mock test.");
        }

        const row = insertedRow as MockTestHistoryRow;
        setMockTestHistory((currentHistory) => [
          normalizeMockTestHistoryRow(row),
          ...currentHistory,
        ]);

        setProgress((current) => applyMockToProgress(current, percentage));
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : "Unable to save your mock test.";
        setError(message);
        throw new Error(message);
      } finally {
        setSavingCount((count) => Math.max(0, count - 1));
      }
    },
    [user],
  );

  const value = useMemo<ProgressContextValue>(
    () => ({
      loading,
      saving: savingCount > 0,
      error,
      stats: {
        totalQuestionsAnswered: progress.totalQuestionsAnswered,
        accuracyPercentage: progress.accuracyPercentage,
        mockTestsCompleted: progress.mockTestsCompleted,
        averageScore: progress.averageScore,
        bestScore: progress.bestScore,
      },
      wrongQuestionIds: progress.wrongQuestionIds,
      mockTestHistory,
      refreshProgress,
      saveQuestionAnswer,
      saveMockTest,
    }),
    [
      loading,
      savingCount,
      error,
      progress,
      mockTestHistory,
      refreshProgress,
      saveQuestionAnswer,
      saveMockTest,
    ],
  );

  return (
    <ProgressContext.Provider value={value}>
      <Outlet />
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);

  if (!context) {
    throw new Error("useProgress must be used inside ProgressProvider.");
  }

  return context;
}
