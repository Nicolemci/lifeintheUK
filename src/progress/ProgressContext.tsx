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

type ProgressContextValue = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  stats: ProgressStats;
  wrongQuestionIds: string[];
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

export function ProgressProvider() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressState>(emptyProgress);
  const [loading, setLoading] = useState(true);
  const [savingCount, setSavingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refreshProgress = useCallback(async () => {
    if (!user) {
      setProgress(emptyProgress);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = await loadSupabaseClient();
      const { data, error: summaryError } = await supabase.rpc(
        "get_user_progress_summary",
      );

      if (summaryError) {
        throw summaryError;
      }

      const rows = (data ?? []) as ProgressSummaryRow[];
      setProgress(normalizeProgressSummary(rows[0]));
    } catch (summaryError) {
      setError(
        summaryError instanceof Error
          ? summaryError.message
          : "Unable to load your progress.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  const saveQuestionAnswer = useCallback(
    async ({ questionId, correct, answeredAt }: SaveQuestionAnswerInput) => {
      if (!user) {
        throw new Error("You must be logged in to save question progress.");
      }

      setSavingCount((count) => count + 1);
      setError(null);

      try {
        const supabase = await loadSupabaseClient();
        const { error: insertError } = await supabase.from("quiz_progress").insert({
          user_id: user.id,
          question_id: questionId,
          correct,
          answered_at: answeredAt ?? new Date().toISOString(),
        });

        if (insertError) {
          throw insertError;
        }

        setProgress((current) => {
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
            accuracyPercentage: Math.round(
              (correctAnswers / totalQuestionsAnswered) * 100,
            ),
            wrongQuestionIds: Array.from(wrongQuestionIds),
          };
        });
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
      if (!user) {
        throw new Error("You must be logged in to save a mock test.");
      }

      setSavingCount((count) => count + 1);
      setError(null);

      try {
        const supabase = await loadSupabaseClient();
        const { error: insertError } = await supabase.from("mock_tests").insert({
          user_id: user.id,
          score,
          percentage,
          completed_at: completedAt,
          duration_seconds: durationSeconds,
        });

        if (insertError) {
          throw insertError;
        }

        setProgress((current) => {
          const mockTestsCompleted = current.mockTestsCompleted + 1;
          const mockScoreTotal = current.mockScoreTotal + percentage;

          return {
            ...current,
            mockTestsCompleted,
            mockScoreTotal,
            averageScore: Math.round(mockScoreTotal / mockTestsCompleted),
            bestScore: Math.max(current.bestScore, percentage),
          };
        });
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
      refreshProgress,
      saveQuestionAnswer,
      saveMockTest,
    }),
    [
      loading,
      savingCount,
      error,
      progress,
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
