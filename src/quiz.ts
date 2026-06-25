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

export type MockTestSet = {
  id: string;
  title: string;
  questions: Question[];
  coveredQuestionCount: number;
  questionRangeLabel: string;
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

export function createMockTestSets(
  availableQuestions: Question[],
  count: number = MOCK_QUESTION_COUNT,
): MockTestSet[] {
  if (availableQuestions.length === 0 || count <= 0) {
    return [];
  }

  const sets: MockTestSet[] = [];

  for (let startIndex = 0; startIndex < availableQuestions.length; startIndex += count) {
    const coveredQuestions = availableQuestions.slice(startIndex, startIndex + count);
    const usedQuestionIds = new Set(coveredQuestions.map((question) => question.id));
    const fillerQuestions =
      coveredQuestions.length < count && availableQuestions.length >= count
        ? availableQuestions
            .filter((question) => !usedQuestionIds.has(question.id))
            .slice(0, count - coveredQuestions.length)
        : [];
    const setNumber = sets.length + 1;
    const rangeEnd = Math.min(startIndex + coveredQuestions.length, availableQuestions.length);

    sets.push({
      id: `mock-${setNumber}`,
      title: `Mock test ${setNumber}`,
      questions: [...coveredQuestions, ...fillerQuestions],
      coveredQuestionCount: coveredQuestions.length,
      questionRangeLabel: `${startIndex + 1}-${rangeEnd} of ${availableQuestions.length}`,
    });
  }

  return sets;
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
