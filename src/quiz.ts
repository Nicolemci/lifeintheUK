import type { Question, TopicId } from "./questions";

export const MOCK_QUESTION_COUNT = 24;
export const MOCK_DURATION_SECONDS = 45 * 60;
export const PASS_PERCENTAGE = 75;

export type AnswerMap = Record<string, number | undefined>;

export type SessionMode = "mock" | "topic" | "wrong";

export type QuizSession = {
  mode: SessionMode;
  title: string;
  questions: Question[];
  answers: AnswerMap;
  currentIndex: number;
  secondsRemaining?: number;
  startedAt: number;
  completedAt?: number;
};

export type ScoreSummary = {
  total: number;
  correct: number;
  percentage: number;
  requiredCorrect: number;
  passed: boolean;
  wrongQuestionIds: string[];
};

export function chooseQuestions(
  availableQuestions: Question[],
  count: number,
  random: () => number = Math.random,
): Question[] {
  return [...availableQuestions]
    .map((question) => ({ question, sort: random() }))
    .sort((left, right) => left.sort - right.sort)
    .slice(0, Math.min(count, availableQuestions.length))
    .map(({ question }) => question);
}

export function questionsForTopic(allQuestions: Question[], topicId: TopicId): Question[] {
  return allQuestions.filter((question) => question.topicId === topicId);
}

export function calculateScore(sessionQuestions: Question[], answers: AnswerMap): ScoreSummary {
  const correct = sessionQuestions.reduce((total, question) => {
    return answers[question.id] === question.correctIndex ? total + 1 : total;
  }, 0);

  const total = sessionQuestions.length;
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);
  const requiredCorrect = Math.ceil(total * (PASS_PERCENTAGE / 100));

  return {
    total,
    correct,
    percentage,
    requiredCorrect,
    passed: total > 0 && correct >= requiredCorrect,
    wrongQuestionIds: sessionQuestions
      .filter((question) => answers[question.id] !== question.correctIndex)
      .map((question) => question.id),
  };
}

export function createAnswerMap(sessionQuestions: Question[]): AnswerMap {
  return Object.fromEntries(sessionQuestions.map((question) => [question.id, undefined]));
}

export function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
