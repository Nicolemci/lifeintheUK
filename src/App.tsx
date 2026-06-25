import { useEffect, useMemo, useState } from "react";
import { questions, topics, type Question, type TopicId } from "./questions";
import {
  MOCK_DURATION_SECONDS,
  MOCK_QUESTION_COUNT,
  type QuizSession,
  type ScoreSummary,
  calculateScore,
  chooseQuestions,
  createAnswerMap,
  formatTime,
  questionsForTopic,
} from "./quiz";
import "./styles.css";

type StoredProgress = {
  wrongQuestionIds: string[];
  completedSessions: number;
  bestMockScore: number;
  latestScore?: {
    mode: QuizSession["mode"];
    title: string;
    correct: number;
    total: number;
    percentage: number;
    passed: boolean;
    completedAt: string;
  };
};

const STORAGE_KEY = "life-in-the-uk-prep-progress-v1";

const defaultProgress: StoredProgress = {
  wrongQuestionIds: [],
  completedSessions: 0,
  bestMockScore: 0,
};

function loadProgress(): StoredProgress {
  try {
    const savedProgress = window.localStorage.getItem(STORAGE_KEY);
    return savedProgress ? { ...defaultProgress, ...JSON.parse(savedProgress) } : defaultProgress;
  } catch {
    return defaultProgress;
  }
}

function saveProgress(progress: StoredProgress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Progress storage is helpful but should not block quiz use in private browsing modes.
  }
}

function updateProgress(
  progress: StoredProgress,
  session: QuizSession,
  score: ScoreSummary,
): StoredProgress {
  const wrongQuestionIds = new Set(progress.wrongQuestionIds);

  session.questions.forEach((question) => {
    if (session.answers[question.id] === question.correctIndex) {
      wrongQuestionIds.delete(question.id);
    } else {
      wrongQuestionIds.add(question.id);
    }
  });

  return {
    wrongQuestionIds: Array.from(wrongQuestionIds),
    completedSessions: progress.completedSessions + 1,
    bestMockScore:
      session.mode === "mock" ? Math.max(progress.bestMockScore, score.percentage) : progress.bestMockScore,
    latestScore: {
      mode: session.mode,
      title: session.title,
      correct: score.correct,
      total: score.total,
      percentage: score.percentage,
      passed: score.passed,
      completedAt: new Date().toISOString(),
    },
  };
}

function createSession(
  mode: QuizSession["mode"],
  title: string,
  sessionQuestions: Question[],
): QuizSession {
  return {
    mode,
    title,
    questions: sessionQuestions,
    answers: createAnswerMap(sessionQuestions),
    currentIndex: 0,
    secondsRemaining: mode === "mock" ? MOCK_DURATION_SECONDS : undefined,
    startedAt: Date.now(),
  };
}

export default function App() {
  const [progress, setProgress] = useState<StoredProgress>(() => loadProgress());
  const [session, setSession] = useState<QuizSession | null>(null);
  const [score, setScore] = useState<ScoreSummary | null>(null);

  const wrongQuestions = useMemo(() => {
    const wrongQuestionIds = new Set(progress.wrongQuestionIds);
    return questions.filter((question) => wrongQuestionIds.has(question.id));
  }, [progress.wrongQuestionIds]);

  const currentQuestion = session?.questions[session.currentIndex];
  const isCompleted = Boolean(session?.completedAt && score);
  const isPracticeMode = session?.mode === "topic" || session?.mode === "wrong";

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (!session || session.mode !== "mock" || session.completedAt || session.secondsRemaining === undefined) {
      return;
    }

    if (session.secondsRemaining <= 0) {
      finishSession(session);
      return;
    }

    const timerId = window.setTimeout(() => {
      setSession((currentSession) => {
        if (!currentSession || currentSession.mode !== "mock" || currentSession.completedAt) {
          return currentSession;
        }

        return {
          ...currentSession,
          secondsRemaining: Math.max(0, (currentSession.secondsRemaining ?? 0) - 1),
        };
      });
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [session]);

  function startMockTest() {
    const selectedQuestions = chooseQuestions(questions, MOCK_QUESTION_COUNT);
    setSession(createSession("mock", "Timed mock test", selectedQuestions));
    setScore(null);
  }

  function startTopicPractice(topicId: TopicId) {
    const topic = topics.find((item) => item.id === topicId);
    const selectedQuestions = questionsForTopic(questions, topicId);
    setSession(createSession("topic", topic?.name ?? "Topic practice", selectedQuestions));
    setScore(null);
  }

  function startWrongQuestionReview() {
    if (wrongQuestions.length === 0) {
      return;
    }

    setSession(createSession("wrong", "Wrong-question revision", wrongQuestions));
    setScore(null);
  }

  function answerCurrentQuestion(optionIndex: number) {
    if (!session || !currentQuestion || session.completedAt) {
      return;
    }

    const alreadyAnsweredInPractice = isPracticeMode && session.answers[currentQuestion.id] !== undefined;
    if (alreadyAnsweredInPractice) {
      return;
    }

    setSession({
      ...session,
      answers: {
        ...session.answers,
        [currentQuestion.id]: optionIndex,
      },
    });
  }

  function goToQuestion(index: number) {
    if (!session || index < 0 || index >= session.questions.length) {
      return;
    }

    setSession({
      ...session,
      currentIndex: index,
    });
  }

  function finishSession(sessionToFinish = session) {
    if (!sessionToFinish || sessionToFinish.completedAt) {
      return;
    }

    const finalScore = calculateScore(sessionToFinish.questions, sessionToFinish.answers);
    const completedSession = {
      ...sessionToFinish,
      completedAt: Date.now(),
    };

    setScore(finalScore);
    setSession(completedSession);
    setProgress((currentProgress) => updateProgress(currentProgress, completedSession, finalScore));
  }

  function resetToHome() {
    setSession(null);
    setScore(null);
  }

  if (session && isCompleted && score) {
    return (
      <main className="app-shell">
        <ResultsView
          session={session}
          score={score}
          onRetake={session.mode === "mock" ? startMockTest : undefined}
          onReviewWrong={wrongQuestions.length > 0 ? startWrongQuestionReview : undefined}
          onHome={resetToHome}
        />
      </main>
    );
  }

  if (session && currentQuestion) {
    const answeredCount = Object.values(session.answers).filter((answer) => answer !== undefined).length;
    const selectedAnswer = session.answers[currentQuestion.id];
    const showExplanation = isPracticeMode && selectedAnswer !== undefined;

    return (
      <main className="app-shell">
        <section className="quiz-layout" aria-labelledby="quiz-title">
          <header className="quiz-header card">
            <div>
              <p className="eyebrow">{session.mode === "mock" ? "Real-test style" : "Practice mode"}</p>
              <h1 id="quiz-title">{session.title}</h1>
              <p>
                Question {session.currentIndex + 1} of {session.questions.length} · {answeredCount} answered
              </p>
            </div>
            <div className="quiz-header-actions">
              {session.mode === "mock" ? (
                <div className="timer" aria-live="polite">
                  {formatTime(session.secondsRemaining ?? 0)}
                </div>
              ) : null}
              <button className="ghost-button" type="button" onClick={resetToHome}>
                Exit
              </button>
            </div>
          </header>

          <aside className="question-map card" aria-label="Question navigation">
            {session.questions.map((question, index) => (
              <button
                key={question.id}
                className={[
                  "question-pill",
                  index === session.currentIndex ? "active" : "",
                  session.answers[question.id] !== undefined ? "answered" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="button"
                onClick={() => goToQuestion(index)}
                aria-label={`Go to question ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
          </aside>

          <section className="question-card card">
            <p className="topic-label">{currentQuestion.topic}</p>
            <h2>{currentQuestion.prompt}</h2>
            <div className="answer-list">
              {currentQuestion.options.map((option, optionIndex) => {
                const isSelected = selectedAnswer === optionIndex;
                const isCorrect = currentQuestion.correctIndex === optionIndex;
                const revealClass = showExplanation
                  ? isCorrect
                    ? "correct"
                    : isSelected
                      ? "incorrect"
                      : ""
                  : "";

                return (
                  <button
                    key={option}
                    className={["answer-option", isSelected ? "selected" : "", revealClass]
                      .filter(Boolean)
                      .join(" ")}
                    type="button"
                    onClick={() => answerCurrentQuestion(optionIndex)}
                    disabled={showExplanation}
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    {option}
                  </button>
                );
              })}
            </div>

            {showExplanation ? (
              <div className="explanation" role="status">
                <strong>
                  {selectedAnswer === currentQuestion.correctIndex ? "Correct." : "Not quite."}
                </strong>{" "}
                {currentQuestion.explanation}
              </div>
            ) : null}

            <footer className="question-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => goToQuestion(session.currentIndex - 1)}
                disabled={session.currentIndex === 0}
              >
                Previous
              </button>
              {session.currentIndex < session.questions.length - 1 ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => goToQuestion(session.currentIndex + 1)}
                >
                  Next question
                </button>
              ) : (
                <button className="primary-button" type="button" onClick={() => finishSession()}>
                  Finish session
                </button>
              )}
            </footer>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Life in the UK test prep</p>
          <h1>Mock tests, topic practice, and wrong-question revision in one place.</h1>
          <p>
            Train for the official test format with a 45-minute timer, practise by topic, and keep
            revising questions you miss until they are cleared from your list.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={startMockTest}>
              Start timed mock test
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={startWrongQuestionReview}
              disabled={wrongQuestions.length === 0}
            >
              Revise wrong questions ({wrongQuestions.length})
            </button>
          </div>
        </div>
        <div className="score-card card">
          <p className="eyebrow">Your progress</p>
          <strong>{progress.bestMockScore}%</strong>
          <span>Best mock score</span>
          <dl>
            <div>
              <dt>Sessions completed</dt>
              <dd>{progress.completedSessions}</dd>
            </div>
            <div>
              <dt>Wrong-question bank</dt>
              <dd>{wrongQuestions.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mode-grid" aria-label="Study modes">
        <article className="card mode-card">
          <p className="eyebrow">Mock test</p>
          <h2>Practise under real-test pressure</h2>
          <p>
            Answer {MOCK_QUESTION_COUNT} randomly selected questions in 45 minutes. You need 75% to
            pass, matching the real Life in the UK test threshold.
          </p>
          <button className="primary-button" type="button" onClick={startMockTest}>
            Start mock
          </button>
        </article>

        <article className="card mode-card">
          <p className="eyebrow">Wrong questions</p>
          <h2>Revise what you missed</h2>
          <p>
            Incorrect answers are saved automatically. Answer them correctly in review mode to remove
            them from your wrong-question bank.
          </p>
          <button
            className="secondary-button"
            type="button"
            onClick={startWrongQuestionReview}
            disabled={wrongQuestions.length === 0}
          >
            {wrongQuestions.length === 0 ? "No wrong questions yet" : "Review wrong questions"}
          </button>
        </article>
      </section>

      <section className="topics-section" aria-labelledby="topics-title">
        <div className="section-heading">
          <p className="eyebrow">Practice by topic</p>
          <h2 id="topics-title">Choose one area to revise</h2>
        </div>
        <div className="topic-grid">
          {topics.map((topic) => {
            const questionCount = questionsForTopic(questions, topic.id).length;

            return (
              <article className="card topic-card" key={topic.id}>
                <h3>{topic.name}</h3>
                <p>{topic.description}</p>
                <span>{questionCount} questions</span>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => startTopicPractice(topic.id)}
                >
                  Practise this topic
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {progress.latestScore ? (
        <section className="card latest-score" aria-labelledby="latest-score-title">
          <div>
            <p className="eyebrow">Latest result</p>
            <h2 id="latest-score-title">{progress.latestScore.title}</h2>
          </div>
          <p>
            {progress.latestScore.correct}/{progress.latestScore.total} correct ·{" "}
            {progress.latestScore.percentage}% ·{" "}
            {progress.latestScore.passed ? "Passed" : "Keep revising"}
          </p>
        </section>
      ) : null}

      <p className="disclaimer">
        This app uses original practice questions for revision. Always study the latest official Life
        in the UK handbook and guidance before booking your test.
      </p>
    </main>
  );
}

type ResultsViewProps = {
  session: QuizSession;
  score: ScoreSummary;
  onRetake?: () => void;
  onReviewWrong?: () => void;
  onHome: () => void;
};

function ResultsView({ session, score, onRetake, onReviewWrong, onHome }: ResultsViewProps) {
  return (
    <section className="results card" aria-labelledby="results-title">
      <p className="eyebrow">Session complete</p>
      <h1 id="results-title">{score.passed ? "You passed this session" : "Keep practising"}</h1>
      <p className="result-score">
        {score.correct}/{score.total} correct · {score.percentage}%
      </p>
      <p>
        Passing mark for this session is {score.requiredCorrect} correct answers ({score.total > 0 ? "75%" : "0%"}).
      </p>
      <div className="hero-actions">
        <button className="primary-button" type="button" onClick={onHome}>
          Back to dashboard
        </button>
        {onRetake ? (
          <button className="secondary-button" type="button" onClick={onRetake}>
            Retake mock
          </button>
        ) : null}
        {onReviewWrong ? (
          <button className="secondary-button" type="button" onClick={onReviewWrong}>
            Review wrong questions
          </button>
        ) : null}
      </div>

      <div className="review-list">
        {session.questions.map((question, index) => {
          const selectedAnswer = session.answers[question.id];
          const answeredCorrectly = selectedAnswer === question.correctIndex;

          return (
            <article className="review-item" key={question.id}>
              <p className="topic-label">
                Question {index + 1} · {question.topic}
              </p>
              <h2>{question.prompt}</h2>
              <p className={answeredCorrectly ? "review-correct" : "review-incorrect"}>
                Your answer:{" "}
                {selectedAnswer === undefined ? "Not answered" : question.options[selectedAnswer]}
              </p>
              {!answeredCorrectly ? <p>Correct answer: {question.options[question.correctIndex]}</p> : null}
              <p>{question.explanation}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
