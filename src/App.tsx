import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { questions, topics, type Question, type TopicId } from "./questions";
import {
  MOCK_DURATION_SECONDS,
  MOCK_QUESTION_COUNT,
  MINIMUM_NUMBERED_MOCK_TESTS,
  type QuizSession,
  type ScoreSummary,
  calculateScore,
  chooseQuestions,
  createMockTestSets,
  createAnswerMap,
  formatTime,
  questionsForTopic,
} from "./quiz";
import {
  ILR_ROLLING_12_MONTHS_GUIDE_LIMIT,
  NATURALISATION_LAST_12_MONTHS_LIMIT,
  NATURALISATION_LAST_5_YEARS_LIMIT,
  type AbsenceRecord,
  countAbsenceDays,
  createAbsenceId,
  displayDateToIso,
  isoDateToDisplay,
  summarizeAbsences,
} from "./absence";
import { officialTestInfoSections } from "./testInfoContent";
import { findClosestTestCentres, type NearbyTestCentre } from "./testCentres";
import { buildStudyGuide } from "./handbookStudyGuide";
import { useAuth } from "./auth/AuthContext";
import LogoutButton from "./auth/LogoutButton";
import { FREE_MOCK_TEST_LIMIT } from "./config/premium";
import { usePremium } from "./premium/PremiumContext";
import { useProgress } from "./progress/ProgressContext";
import "./styles.css";

type StoredProgress = {
  wrongQuestionIds: string[];
  completedSessions: number;
  bestMockScore: number;
  mockScoreHistory: number[];
  absences: AbsenceRecord[];
  mockTestResults: Record<
    string,
    {
      title: string;
      correct: number;
      total: number;
      percentage: number;
      passed: boolean;
      completedAt: string;
    }
  >;
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

type AuthUser = {
  id: string;
  displayName: string;
};

type StoredUserProfile = AuthUser & {
  createdAt: string;
  lastLoginAt: string;
  progress: StoredProgress;
};

type AppTab = "study" | "test-info" | "handbook" | "absence";

const LEGACY_PROGRESS_KEY = "life-in-the-uk-prep-progress-v1";
const USERS_STORAGE_KEY = "life-in-the-uk-prep-users-v1";

const defaultProgress: StoredProgress = {
  wrongQuestionIds: [],
  completedSessions: 0,
  bestMockScore: 0,
  mockScoreHistory: [],
  absences: [],
  mockTestResults: {},
};

function loadLegacyProgress(): StoredProgress | null {
  try {
    const savedProgress = window.localStorage.getItem(LEGACY_PROGRESS_KEY);
    return savedProgress ? { ...defaultProgress, ...JSON.parse(savedProgress) } : null;
  } catch {
    return null;
  }
}

function loadProfiles(): Record<string, StoredUserProfile> {
  try {
    const savedProfiles = window.localStorage.getItem(USERS_STORAGE_KEY);
    return savedProfiles ? JSON.parse(savedProfiles) : {};
  } catch {
    return {};
  }
}

function saveProfiles(profiles: Record<string, StoredUserProfile>) {
  try {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Progress storage is helpful but should not block quiz use in private browsing modes.
  }
}

function loadProgressForUser(user: AuthUser): StoredProgress {
  const profiles = loadProfiles();
  const existingProfile = profiles[user.id];
  const legacyProgress = Object.keys(profiles).length === 0 ? loadLegacyProgress() : null;

  return {
    ...defaultProgress,
    ...(existingProfile?.progress ?? legacyProgress ?? {}),
  };
}

function saveProgressForUser(user: AuthUser, progress: StoredProgress) {
  const profiles = loadProfiles();
  const existingProfile = profiles[user.id];
  const now = new Date().toISOString();

  profiles[user.id] = {
    ...user,
    createdAt: existingProfile?.createdAt ?? now,
    lastLoginAt: now,
    progress,
  };
  saveProfiles(profiles);
}

function updateProgress(
  progress: StoredProgress,
  session: QuizSession,
  score: ScoreSummary,
): StoredProgress {
  const wrongQuestionIds = new Set(progress.wrongQuestionIds);
  const completedAt = new Date().toISOString();

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
    mockScoreHistory:
      session.mode === "mock" ? [...progress.mockScoreHistory, score.percentage] : progress.mockScoreHistory,
    absences: progress.absences,
    mockTestResults:
      session.mode === "mock" && session.mockTestId
        ? {
            ...progress.mockTestResults,
            [session.mockTestId]: {
              title: session.title,
              correct: score.correct,
              total: score.total,
              percentage: score.percentage,
              passed: score.passed,
              completedAt,
            },
          }
        : progress.mockTestResults,
    latestScore: {
      mode: session.mode,
      title: session.title,
      correct: score.correct,
      total: score.total,
      percentage: score.percentage,
      passed: score.passed,
      completedAt,
    },
  };
}

function createSession(
  mode: QuizSession["mode"],
  title: string,
  sessionQuestions: Question[],
  options: Pick<QuizSession, "mockTestId" | "immediateFeedback"> = {},
): QuizSession {
  return {
    mode,
    title,
    questions: sessionQuestions,
    answers: createAnswerMap(sessionQuestions),
    currentIndex: 0,
    secondsRemaining: mode === "mock" ? MOCK_DURATION_SECONDS : undefined,
    ...options,
    startedAt: Date.now(),
  };
}

export default function App() {
  const { user: supabaseUser } = useAuth();
  const navigate = useNavigate();
  const {
    loading: premiumLoading,
    error: premiumError,
    hasPremium,
    freeMockTestsRemaining,
    canStartMockTest,
  } = usePremium();
  const {
    loading: progressLoading,
    saving: progressSaving,
    error: progressError,
    stats: cloudStats,
    wrongQuestionIds: cloudWrongQuestionIds,
    saveQuestionAnswer,
    saveMockTest,
  } = useProgress();
  const currentUser = useMemo<AuthUser>(
    () => ({
      id: supabaseUser?.id ?? "",
      displayName: supabaseUser?.email ?? "Guest",
    }),
    [supabaseUser?.id, supabaseUser?.email],
  );
  const [progress, setProgress] = useState<StoredProgress>(() =>
    currentUser.id ? loadProgressForUser(currentUser) : defaultProgress,
  );
  const [session, setSession] = useState<QuizSession | null>(null);
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("study");
  const [sessionSaveError, setSessionSaveError] = useState("");
  const [answerSaveError, setAnswerSaveError] = useState("");
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const completionInProgress = useRef(false);

  const wrongQuestions = useMemo(() => {
    const wrongQuestionIds = new Set(
      progressLoading ? progress.wrongQuestionIds : cloudWrongQuestionIds,
    );
    return questions.filter((question) => wrongQuestionIds.has(question.id));
  }, [progressLoading, progress.wrongQuestionIds, cloudWrongQuestionIds]);
  const mockTestSets = useMemo(
    () => createMockTestSets(questions, MOCK_QUESTION_COUNT, MINIMUM_NUMBERED_MOCK_TESTS),
    [],
  );
  const absenceSummary = useMemo(() => summarizeAbsences(progress.absences), [progress.absences]);

  const currentQuestion = session?.questions[session.currentIndex];
  const isCompleted = Boolean(session?.completedAt && score);
  const isPracticeMode = session?.mode === "topic" || session?.mode === "wrong";
  const isImmediateFeedbackMode = isPracticeMode || Boolean(session?.immediateFeedback);

  useEffect(() => {
    if (currentUser.id) {
      saveProgressForUser(currentUser, progress);
    }
  }, [currentUser, progress]);

  useEffect(() => {
    if (
      !session ||
      session.mode !== "mock" ||
      session.completedAt ||
      session.secondsRemaining === undefined ||
      sessionSaveError ||
      savingAnswer
    ) {
      return;
    }

    if (session.secondsRemaining <= 0) {
      void finishSession(session);
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
  }, [session, sessionSaveError, savingAnswer]);

  function prepareMockTestStart(): boolean {
    if (premiumLoading || premiumError) {
      return false;
    }

    if (!canStartMockTest) {
      navigate("/upgrade", {
        state: {
          upgradeReason: "mock-limit",
        },
      });
      return false;
    }

    setSessionSaveError("");
    setAnswerSaveError("");
    completionInProgress.current = false;
    return true;
  }

  function startMockTest() {
    if (!prepareMockTestStart()) {
      return;
    }

    const selectedQuestions = chooseQuestions(questions, MOCK_QUESTION_COUNT);
    setSession(createSession("mock", "Random timed mock test", selectedQuestions));
    setScore(null);
  }

  function startMockTestSet(testSetIndex: number) {
    if (!prepareMockTestStart()) {
      return;
    }

    const testSet = mockTestSets[testSetIndex];

    if (!testSet) {
      return;
    }

    setSession(
      createSession("mock", testSet.title, testSet.questions, {
        mockTestId: testSet.id,
        immediateFeedback: true,
      }),
    );
    setScore(null);
  }

  function startTopicPractice(topicId: TopicId) {
    const topic = topics.find((item) => item.id === topicId);
    const selectedQuestions = questionsForTopic(questions, topicId);
    setSession(createSession("topic", topic?.name ?? "Topic practice", selectedQuestions));
    setScore(null);
    setAnswerSaveError("");
  }

  function startWrongQuestionReview() {
    if (wrongQuestions.length === 0) {
      return;
    }

    setSession(createSession("wrong", "Wrong-question revision", wrongQuestions));
    setScore(null);
    setAnswerSaveError("");
  }

  async function answerCurrentQuestion(optionIndex: number) {
    if (!session || !currentQuestion || session.completedAt || savingAnswer) {
      return;
    }

    const alreadyAnsweredWithFeedback =
      isImmediateFeedbackMode && session.answers[currentQuestion.id] !== undefined;
    if (alreadyAnsweredWithFeedback) {
      return;
    }

    setSavingAnswer(true);
    setAnswerSaveError("");

    try {
      await saveQuestionAnswer({
        questionId: currentQuestion.id,
        correct: optionIndex === currentQuestion.correctIndex,
        answeredAt: new Date().toISOString(),
      });
      setSession({
        ...session,
        answers: {
          ...session.answers,
          [currentQuestion.id]: optionIndex,
        },
      });
    } catch (saveError) {
      setAnswerSaveError(
        saveError instanceof Error
          ? `Your answer could not be saved: ${saveError.message}`
          : "Your answer could not be saved. Please try again.",
      );
    } finally {
      setSavingAnswer(false);
    }
  }

  function goToQuestion(index: number) {
    if (!session || index < 0 || index >= session.questions.length) {
      return;
    }

    setSession({
      ...session,
      currentIndex: index,
    });
    setAnswerSaveError("");
  }

  async function finishSession(sessionToFinish = session) {
    if (
      !sessionToFinish ||
      sessionToFinish.completedAt ||
      completionInProgress.current
    ) {
      return;
    }

    completionInProgress.current = true;
    setSavingSession(true);
    setSessionSaveError("");
    setAnswerSaveError("");
    const finalScore = calculateScore(sessionToFinish.questions, sessionToFinish.answers);
    const completedAtMilliseconds = Date.now();
    const completedAt = new Date(completedAtMilliseconds).toISOString();
    const durationSeconds = Math.max(
      0,
      Math.round((completedAtMilliseconds - sessionToFinish.startedAt) / 1000),
    );
    const completedSession = {
      ...sessionToFinish,
      completedAt: completedAtMilliseconds,
    };

    try {
      if (sessionToFinish.mode === "mock") {
        await saveMockTest({
          score: finalScore.correct,
          percentage: finalScore.percentage,
          completedAt,
          durationSeconds,
        });
      }

      setScore(finalScore);
      setSession(completedSession);
      setProgress((currentProgress) =>
        updateProgress(currentProgress, completedSession, finalScore),
      );
    } catch (saveError) {
      setSessionSaveError(
        saveError instanceof Error
          ? `Your test could not be saved: ${saveError.message}`
          : "Your test could not be saved. Please try again.",
      );
      completionInProgress.current = false;
    } finally {
      setSavingSession(false);
    }
  }

  function resetToHome() {
    setSession(null);
    setScore(null);
    setSessionSaveError("");
    completionInProgress.current = false;
    setActiveTab("study");
  }

  function switchTab(tab: AppTab) {
    setSession(null);
    setScore(null);
    setActiveTab(tab);
  }

  function addAbsence(absence: Omit<AbsenceRecord, "id">) {
    setProgress((currentProgress) => ({
      ...currentProgress,
      absences: [
        {
          ...absence,
          id: createAbsenceId(),
        },
        ...currentProgress.absences,
      ].sort((left, right) => right.departedOn.localeCompare(left.departedOn)),
    }));
  }

  function deleteAbsence(absenceId: string) {
    setProgress((currentProgress) => ({
      ...currentProgress,
      absences: currentProgress.absences.filter((absence) => absence.id !== absenceId),
    }));
  }

  if (session && isCompleted && score) {
    const retakeMock = () => {
      if (session.mockTestId) {
        const mockTestIndex = mockTestSets.findIndex((testSet) => testSet.id === session.mockTestId);

        if (mockTestIndex >= 0) {
          startMockTestSet(mockTestIndex);
          return;
        }
      }

      startMockTest();
    };

    return (
      <main className="app-shell">
        <ResultsView
          session={session}
          score={score}
          onRetake={session.mode === "mock" ? retakeMock : undefined}
          onReviewWrong={wrongQuestions.length > 0 ? startWrongQuestionReview : undefined}
          onHome={resetToHome}
          currentUser={currentUser}
        />
      </main>
    );
  }

  if (session && currentQuestion) {
    const answeredCount = Object.values(session.answers).filter((answer) => answer !== undefined).length;
    const selectedAnswer = session.answers[currentQuestion.id];
    const showExplanation = isImmediateFeedbackMode && selectedAnswer !== undefined;

    return (
      <main className="app-shell">
        <section className="quiz-layout" aria-labelledby="quiz-title">
          <header className="quiz-header card">
            <div>
              <p className="eyebrow">{session.mode === "mock" ? "Real-test style" : "Practice mode"}</p>
              <h1 id="quiz-title">{session.title}</h1>
              <p>
                Question {session.currentIndex + 1} of {session.questions.length} · {answeredCount} answered
                {" · "}Signed in as {currentUser.displayName}
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
              {supabaseUser ? (
                <LogoutButton />
              ) : (
                <Link className="ghost-button" to="/login">
                  Log in
                </Link>
              )}
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
                    onClick={() => void answerCurrentQuestion(optionIndex)}
                    disabled={showExplanation || savingAnswer}
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    {option}
                  </button>
                );
              })}
            </div>

            {showExplanation ? (
              <AnswerFeedback question={currentQuestion} selectedAnswer={selectedAnswer} />
            ) : null}

            {savingAnswer ? <p className="progress-saving">Saving answer…</p> : null}
            {answerSaveError ? <p className="form-error session-save-error">{answerSaveError}</p> : null}
            {sessionSaveError ? <p className="form-error session-save-error">{sessionSaveError}</p> : null}

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
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void finishSession()}
                  disabled={savingSession}
                >
                  {savingSession ? "Saving result…" : sessionSaveError ? "Try saving again" : "Finish session"}
                </button>
              )}
            </footer>
          </section>
        </section>
      </main>
    );
  }

  if (activeTab === "absence") {
    return (
      <main className="app-shell">
        <AppTabs
          activeTab={activeTab}
          currentUser={currentUser}
          onChange={switchTab}
        />
        <AbsenceTracker
          absences={progress.absences}
          summary={absenceSummary}
          onAddAbsence={addAbsence}
          onDeleteAbsence={deleteAbsence}
        />
      </main>
    );
  }

  if (activeTab === "handbook") {
    return (
      <main className="app-shell">
        <AppTabs
          activeTab={activeTab}
          currentUser={currentUser}
          onChange={switchTab}
        />
        <HandbookReader />
      </main>
    );
  }

  if (activeTab === "test-info") {
    return (
      <main className="app-shell">
        <AppTabs
          activeTab={activeTab}
          currentUser={currentUser}
          onChange={switchTab}
        />
        <OfficialTestInfo />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <AppTabs
        activeTab={activeTab}
        currentUser={currentUser}
        onChange={switchTab}
      />
      <section className="hero">
        <div>
          <p className="british-kicker">Life in the UK test prep</p>
          <h1>Mock tests, topic practice, and wrong-question revision in one place.</h1>
          <p>
            Train for the official test format with a 45-minute timer, practise by topic, and keep
            revising questions you miss until they are cleared from your list.
          </p>
          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={startMockTest}
              disabled={premiumLoading || Boolean(premiumError)}
            >
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
            <Link className="secondary-button" to={supabaseUser ? "/pricing" : "/upgrade"}>
              Premium plans
            </Link>
          </div>
          <UKLandmarkSkyline />
        </div>
        <div className="score-card card">
          <p className="eyebrow">Your progress</p>
          <div className="royal-badge" aria-hidden="true">
            🇬🇧
          </div>
          <div className="profile-summary">
            <span>{supabaseUser ? "Signed in as" : "Browsing as"}</span>
            <strong className="profile-name">{currentUser.displayName}</strong>
            {supabaseUser ? (
              <LogoutButton />
            ) : (
              <div className="guest-account-actions">
                <Link className="ghost-button" to="/login">
                  Log in
                </Link>
                <Link className="ghost-button" to="/sign-up">
                  Create account
                </Link>
              </div>
            )}
          </div>
          <div className="score-highlights">
            <div>
              <strong>{progressLoading ? "—" : `${cloudStats.bestScore}%`}</strong>
              <span>Best test score</span>
            </div>
            <div>
              <strong>{progressLoading ? "—" : `${cloudStats.averageScore}%`}</strong>
              <span>Average test score</span>
            </div>
          </div>
          <dl>
            <div>
              <dt>Total questions answered</dt>
              <dd>{progressLoading ? "—" : cloudStats.totalQuestionsAnswered}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{progressLoading ? "—" : `${cloudStats.accuracyPercentage}%`}</dd>
            </div>
            <div>
              <dt>Mock tests completed</dt>
              <dd>{progressLoading ? "—" : cloudStats.mockTestsCompleted}</dd>
            </div>
            <div>
              <dt>Wrong-question bank</dt>
              <dd>{wrongQuestions.length}</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd className="access-status">{hasPremium ? "Premium" : "Free"}</dd>
            </div>
            {!hasPremium ? (
              <div>
                <dt>Free mock tests left</dt>
                <dd>{freeMockTestsRemaining}</dd>
              </div>
            ) : null}
          </dl>
          {progressSaving ? <span className="progress-saving">Saving progress…</span> : null}
        </div>
      </section>

      {progressError ? (
        <p className="form-error premium-load-error">
          Progress could not be synchronized: {progressError}
        </p>
      ) : null}

      {premiumError ? (
        <p className="form-error premium-load-error">
          Premium status could not be loaded: {premiumError}
        </p>
      ) : null}

      <section className="mode-grid" aria-label="Study modes">
        <article className="card mode-card">
          <p className="eyebrow">Mock test</p>
          <h2>Practise under real-test pressure</h2>
          <p>
            Answer {MOCK_QUESTION_COUNT} randomly selected questions in 45 minutes. You need 75% to
            pass, matching the real Life in the UK test threshold.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={startMockTest}
            disabled={premiumLoading || Boolean(premiumError)}
          >
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

      <section className="mock-bank-section" aria-labelledby="mock-bank-title">
        <div className="section-heading">
          <p className="eyebrow">Full question coverage</p>
          <h2 id="mock-bank-title">{mockTestSets.length} full mock tests cover every question</h2>
          <p>
            Work through these in order to see the whole question bank. Each mock uses the real
            45-minute timer and 24-question format, with review questions mixed in where needed.
            {!hasPremium
              ? ` Free accounts can complete ${FREE_MOCK_TEST_LIMIT} mock tests in total.`
              : " Your Premium access includes unlimited mock tests."}
          </p>
        </div>
        <div className="mock-test-grid">
          {mockTestSets.map((testSet, index) => {
            const latestResult = progress.mockTestResults[testSet.id];

            return (
              <article className="card mock-test-card" key={testSet.id}>
                <span className="mock-number">{index + 1}</span>
                <div>
                  <h3>{testSet.title}</h3>
                  <p>
                    Introduces questions {testSet.questionRangeLabel}
                    {testSet.coveredQuestionCount < MOCK_QUESTION_COUNT
                      ? `, plus ${MOCK_QUESTION_COUNT - testSet.coveredQuestionCount} review questions`
                      : ""}
                    .
                  </p>
                  <p className={latestResult ? "mock-result taken" : "mock-result"}>
                    {latestResult
                      ? `Last score: ${latestResult.percentage}% (${latestResult.correct}/${latestResult.total})`
                      : "Not taken yet"}
                  </p>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => startMockTestSet(index)}
                  disabled={premiumLoading || Boolean(premiumError)}
                >
                  Start {testSet.title.toLowerCase()}
                </button>
              </article>
            );
          })}
        </div>
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
  currentUser: AuthUser;
};

type AppTabsProps = {
  activeTab: AppTab;
  currentUser: AuthUser;
  onChange: (tab: AppTab) => void;
};

function AppTabs({ activeTab, currentUser, onChange }: AppTabsProps) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function selectTab(tab: AppTab) {
    onChange(tab);
    closeMenu();
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("mobile-nav-open");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("mobile-nav-open");
    };
  }, [menuOpen]);

  const profileControls = (
    <div className="tab-profile">
      <span>{currentUser.displayName}</span>
      {user ? (
        <LogoutButton />
      ) : (
        <>
          <Link to="/login" onClick={closeMenu}>
            Log in
          </Link>
          <Link className="secondary-button" to="/sign-up" onClick={closeMenu}>
            Create account
          </Link>
        </>
      )}
    </div>
  );

  const sectionButtons = (
    <>
      <button
        className={["tab-button", activeTab === "study" ? "active" : ""].filter(Boolean).join(" ")}
        type="button"
        role="tab"
        aria-selected={activeTab === "study"}
        onClick={() => selectTab("study")}
      >
        Study
      </button>
      <button
        className={["tab-button", activeTab === "test-info" ? "active" : ""].filter(Boolean).join(" ")}
        type="button"
        role="tab"
        aria-selected={activeTab === "test-info"}
        onClick={() => selectTab("test-info")}
      >
        Test info
      </button>
      <button
        className={["tab-button", activeTab === "handbook" ? "active" : ""].filter(Boolean).join(" ")}
        type="button"
        role="tab"
        aria-selected={activeTab === "handbook"}
        onClick={() => selectTab("handbook")}
      >
        Handbook
      </button>
      <button
        className={["tab-button", activeTab === "absence" ? "active" : ""].filter(Boolean).join(" ")}
        type="button"
        role="tab"
        aria-selected={activeTab === "absence"}
        onClick={() => selectTab("absence")}
      >
        Away tracker
      </button>
    </>
  );

  return (
    <nav className="app-tabs card" aria-label="Main app sections">
      <div className="tab-group desktop-nav" role="tablist" aria-label="Choose app section">
        {sectionButtons}
      </div>
      <div className="desktop-nav">{profileControls}</div>

      <div className="mobile-nav-bar">
        <p className="british-kicker mobile-nav-brand">Life in the UK test prep</p>
        <button
          className="mobile-nav-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setMenuOpen(true)}
        >
          <span>Menu</span>
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      <button
        className={["mobile-nav-backdrop", menuOpen ? "is-open" : ""].filter(Boolean).join(" ")}
        type="button"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <div
        id="mobile-nav-drawer"
        className={["mobile-nav-drawer", menuOpen ? "is-open" : ""].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="App menu"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-nav-drawer-header">
          <strong>Menu</strong>
          <button className="ghost-button mobile-nav-close" type="button" onClick={closeMenu}>
            Close
          </button>
        </div>
        <div className="tab-group mobile-nav-links" role="tablist" aria-label="Choose app section">
          {sectionButtons}
        </div>
        {profileControls}
      </div>
    </nav>
  );
}

function UKLandmarkSkyline() {
  return (
    <svg
      className="uk-landmark-skyline"
      viewBox="0 0 720 150"
      role="img"
      aria-label="UK landmarks including the London Eye, Elizabeth Tower, Tower Bridge and Edinburgh Castle"
    >
      <g className="skyline-blue">
        <circle cx="160" cy="70" r="52" fill="none" strokeWidth="8" />
        <circle cx="160" cy="70" r="6" />
        <path d="M160 18v104M108 70h104M123 33l74 74M197 33l-74 74" fill="none" strokeWidth="3" />
        <path d="M135 126h50l-12-46h-26z" />
        <path d="M285 130V37h43v93zM292 37l14-22 15 22z" />
        <circle cx="306" cy="59" r="10" className="skyline-clock" />
        <path d="M298 59h8v-7M314 59h-8v8" fill="none" strokeWidth="2" />
        <path d="M380 130V62h34v68zM476 130V62h34v68zM371 62h52l-8-12h-36zM467 62h52l-8-12h-36z" />
        <path d="M414 80h63v15h-63zM397 95c18 20 79 20 97 0" fill="none" strokeWidth="7" />
        <path d="M565 130V78h98v52zM575 78V60h18v18M635 78V57h18v21M603 78V47h22v31" />
        <path d="M552 130h126" fill="none" strokeWidth="8" />
      </g>
      <path className="skyline-red" d="M75 131h610" fill="none" strokeWidth="5" />
    </svg>
  );
}

function HandbookReader() {
  const [searchQuery, setSearchQuery] = useState("");
  const guideSections = useMemo(() => buildStudyGuide(questions), []);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleSections = guideSections
    .map((section) => ({
      ...section,
      facts: normalizedQuery
        ? section.facts.filter(
            (fact) =>
              fact.heading.toLowerCase().includes(normalizedQuery) ||
              fact.detail.toLowerCase().includes(normalizedQuery),
          )
        : section.facts,
    }))
    .filter(
      (section) =>
        section.facts.length > 0 ||
        section.title.toLowerCase().includes(normalizedQuery) ||
        section.introduction.toLowerCase().includes(normalizedQuery),
    );
  const visibleFactCount = visibleSections.reduce((total, section) => total + section.facts.length, 0);
  const totalFactCount = guideSections.reduce((total, section) => total + section.facts.length, 0);

  return (
    <section className="handbook-reader" aria-labelledby="handbook-title">
      <div className="reader-hero card">
        <p className="british-kicker">Detailed revision guide</p>
        <h1 id="handbook-title">Life in the UK key knowledge</h1>
        <p>
          A detailed, structured guide to the important facts from “Values and principles” onward:
          dates, people, wars, laws, government, culture and everyday life—without copying the
          handbook word for word.
        </p>
        <label className="reader-search">
          Search the study guide
          <input
            type="search"
            placeholder="e.g. Magna Carta, Parliament, Florence Nightingale"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="reader-layout">
        <aside className="reader-index card" aria-label="Handbook sections">
          <p className="eyebrow">Contents</p>
          {guideSections.map((section) => (
            <a href={`#guide-${section.id}`} key={section.id}>
              {section.title}
            </a>
          ))}
          <p className="reader-page-count">
            {normalizedQuery
              ? `${visibleFactCount} matching fact${visibleFactCount === 1 ? "" : "s"}`
              : `${totalFactCount} key facts`}
          </p>
        </aside>

        <div className="reader-sections">
          {visibleSections.length === 0 ? (
            <article className="card reader-section">
              <h2>No matching facts</h2>
              <p>Try a different search term.</p>
            </article>
          ) : null}
          {visibleSections.map((section) => (
            <article
              className="card reader-section guide-section"
              id={`guide-${section.id}`}
              key={section.id}
            >
              <p className="eyebrow">{section.chapter}</p>
              <h2>{section.title}</h2>
              <p>{section.introduction}</p>
              <div className="guide-facts">
                {section.facts.map((fact) => (
                  <section className="guide-fact" key={fact.id}>
                    <h3>{fact.heading}</h3>
                    <p>{fact.detail}</p>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OfficialTestInfo() {
  const [postcode, setPostcode] = useState("");
  const [centreMessage, setCentreMessage] = useState("");
  const [nearbyCentres, setNearbyCentres] = useState<NearbyTestCentre[]>([]);
  const [isSearchingCentres, setIsSearchingCentres] = useState(false);

  async function handleCentreSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPostcode = postcode.trim().toUpperCase().replace(/\s+/g, " ");

    if (!trimmedPostcode) {
      setCentreMessage("Enter a valid UK postcode.");
      setNearbyCentres([]);
      return;
    }

    setIsSearchingCentres(true);
    setCentreMessage("");
    setNearbyCentres([]);

    try {
      const response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmedPostcode)}`,
      );

      if (!response.ok) {
        throw new Error("Postcode not found");
      }

      const data: { result?: { latitude?: number; longitude?: number } } = await response.json();
      const latitude = data.result?.latitude;
      const longitude = data.result?.longitude;

      if (latitude === undefined || longitude === undefined) {
        throw new Error("Postcode coordinates unavailable");
      }

      setNearbyCentres(findClosestTestCentres(latitude, longitude, 5));
      setCentreMessage(`Indicative closest centres to ${trimmedPostcode}.`);
    } catch {
      setCentreMessage(
        "We could not find that postcode. Check it and try again, or use the official booking service.",
      );
    } finally {
      setIsSearchingCentres(false);
    }
  }

  return (
    <section className="test-info-section" aria-labelledby="test-info-title">
      <div className="reader-hero card">
        <p className="british-kicker">Official GOV.UK guide</p>
        <h1 id="test-info-title">Life in the UK Test information</h1>
        <p>
          Key official details about booking, preparing, ID, test centres and exemptions. Always use
          GOV.UK for the latest booking rules.
        </p>
        <div className="hero-actions">
          <a
            className="primary-button"
            href="https://www.gov.uk/life-in-the-uk-test"
            rel="noreferrer"
            target="_blank"
          >
            Open GOV.UK booking page
          </a>
        </div>
      </div>

      <div className="test-info-grid">
        <article className="card centre-card">
          <p className="eyebrow">Nearest centres</p>
          <h2>Find a test centre</h2>
          <p>
            GOV.UK says there are over 30 test centres in the UK. You choose the centre when you book
            through the official service.
          </p>
          <form onSubmit={handleCentreSearch}>
            <label>
              Your postcode
              <input
                autoComplete="postal-code"
                placeholder="e.g. SW1A 1AA"
                value={postcode}
                onChange={(event) => setPostcode(event.target.value)}
              />
            </label>
            <button className="secondary-button" type="submit">
              {isSearchingCentres ? "Finding centres…" : "View closest centres"}
            </button>
          </form>
          {centreMessage ? <p className="centre-message">{centreMessage}</p> : null}
          {nearbyCentres.length > 0 ? (
            <ol className="nearby-centres">
              {nearbyCentres.map((centre) => (
                <li key={centre.city}>
                  <div>
                    <strong>{centre.city}</strong>
                    <span>{centre.venue}</span>
                    <span>{centre.address}</span>
                  </div>
                  <b>{centre.distanceMiles} mi</b>
                </li>
              ))}
            </ol>
          ) : null}
          <p className="absence-disclaimer">
            Distances are approximate and centre details can change. This app does not book tests or
            check live availability. Confirm the exact five options, address and appointment times
            in the official GOV.UK booking service.
          </p>
        </article>

        <div className="test-info-cards">
          {officialTestInfoSections.map((section) => (
            <article className="card test-info-card" key={section.id}>
              <h2>{section.title}</h2>
              <p>{section.summary}</p>
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function getOptionExplanation(question: Question, optionIndex: number): string | undefined {
  const authoredExplanation = question.optionExplanations?.[optionIndex];

  if (authoredExplanation) {
    return authoredExplanation;
  }

  if (optionIndex === question.correctIndex) {
    return question.explanation;
  }

  return undefined;
}

function AnswerFeedback({
  question,
  selectedAnswer,
}: {
  question: Question;
  selectedAnswer: number | undefined;
}) {
  if (selectedAnswer === undefined) {
    return null;
  }

  const answeredCorrectly = selectedAnswer === question.correctIndex;
  const selectedExplanation = getOptionExplanation(question, selectedAnswer);
  const relevantWrongOptions = question.options
    .map((option, optionIndex) => ({ option, optionIndex }))
    .filter(
      ({ optionIndex }) =>
        optionIndex !== question.correctIndex && Boolean(getOptionExplanation(question, optionIndex)),
    );

  return (
    <div className="explanation" role="status">
      <strong>{answeredCorrectly ? "Correct." : "Not quite."}</strong>{" "}
      {selectedExplanation ?? "That is not the correct answer for this question."}
      {!answeredCorrectly ? (
        <p>
          Correct answer: <strong>{question.options[question.correctIndex]}</strong>.{" "}
          {question.explanation}
        </p>
      ) : null}
      {relevantWrongOptions.length > 0 ? (
        <details className="option-explanations">
          <summary>Relevant other answers from the handbook</summary>
          <ul>
            {relevantWrongOptions.map(({ option, optionIndex }) => (
              <li key={option}>
                <strong>{option}</strong>: {getOptionExplanation(question, optionIndex)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

type AbsenceTrackerProps = {
  absences: AbsenceRecord[];
  summary: ReturnType<typeof summarizeAbsences>;
  onAddAbsence: (absence: Omit<AbsenceRecord, "id">) => void;
  onDeleteAbsence: (absenceId: string) => void;
};

function AbsenceTracker({ absences, summary, onAddAbsence, onDeleteAbsence }: AbsenceTrackerProps) {
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("Holiday");
  const [departedOnInput, setDepartedOnInput] = useState("");
  const [returnedOnInput, setReturnedOnInput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!destination.trim() || !departedOnInput || !returnedOnInput) {
      setError("Add a destination plus departure and return dates.");
      return;
    }

    const departedOn = displayDateToIso(departedOnInput);
    const returnedOn = displayDateToIso(returnedOnInput);

    if (!departedOn || !returnedOn) {
      setError("Enter dates in dd/mm/yyyy format, for example 05/07/2026.");
      return;
    }

    if (returnedOn < departedOn) {
      setError("Return date must be the same as or after the departure date.");
      return;
    }

    onAddAbsence({
      destination: destination.trim(),
      reason,
      departedOn,
      returnedOn,
      notes: notes.trim() || undefined,
    });

    setDestination("");
    setReason("Holiday");
    setDepartedOnInput("");
    setReturnedOnInput("");
    setNotes("");
    setError("");
  }

  return (
    <section className="absence-section" aria-labelledby="absence-title">
      <div className="section-heading">
        <p className="eyebrow">Away from the UK</p>
        <h2 id="absence-title">Track days outside the UK</h2>
        <p>
          Add trips abroad to monitor full days away from the UK. Departure and return dates are not
          counted as absence days, matching common Home Office absence-counting guidance.
        </p>
      </div>

      <div className="absence-layout">
        <form className="card absence-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Destination
              <input
                placeholder="e.g. France"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              />
            </label>
            <label>
              Reason
              <select value={reason} onChange={(event) => setReason(event.target.value)}>
                <option>Holiday</option>
                <option>Family visit</option>
                <option>Work</option>
                <option>Study</option>
                <option>Medical</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Left the UK
              <input
                inputMode="numeric"
                placeholder="dd/mm/yyyy"
                value={departedOnInput}
                onChange={(event) => setDepartedOnInput(event.target.value)}
              />
            </label>
            <label>
              Returned to the UK
              <input
                inputMode="numeric"
                placeholder="dd/mm/yyyy"
                value={returnedOnInput}
                onChange={(event) => setReturnedOnInput(event.target.value)}
              />
            </label>
          </div>
          <label>
            Notes
            <textarea
              placeholder="Optional details, e.g. family wedding or work trip"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit">
            Add absence
          </button>
        </form>

        <div className="absence-summary">
          <article className="card absence-stat">
            <span>Total away</span>
            <strong>{summary.totalDaysAway}</strong>
            <p>full days outside the UK</p>
          </article>
          <article className="card absence-stat">
            <span>Last 12 months</span>
            <strong>{summary.last12MonthsDays}</strong>
            <p>
              of {NATURALISATION_LAST_12_MONTHS_LIMIT} days for naturalisation guidance
            </p>
          </article>
          <article className="card absence-stat">
            <span>Last 5 years</span>
            <strong>{summary.last5YearsDays}</strong>
            <p>of {NATURALISATION_LAST_5_YEARS_LIMIT} days for naturalisation guidance</p>
          </article>
          <article className="card absence-stat">
            <span>ILR guide</span>
            <strong>{summary.last12MonthsDays}</strong>
            <p>of {ILR_ROLLING_12_MONTHS_GUIDE_LIMIT} days in the latest 12-month window</p>
          </article>
        </div>
      </div>

      <div className="card absence-list">
        <div className="absence-list-heading">
          <h3>Recorded absences</h3>
          <span>
            {summary.absenceCount} trip{summary.absenceCount === 1 ? "" : "s"} · longest{" "}
            {summary.longestAbsenceDays} days
          </span>
        </div>
        {absences.length === 0 ? (
          <p className="empty-state">No absences recorded yet.</p>
        ) : (
          <div className="absence-items">
            {absences.map((absence) => {
              const absenceDays = countAbsenceDays(absence);

              return (
                <article className="absence-item" key={absence.id}>
                  <div>
                    <p className="topic-label">{absence.reason}</p>
                    <h4>{absence.destination}</h4>
                    <p>
                      {isoDateToDisplay(absence.departedOn)} to{" "}
                      {isoDateToDisplay(absence.returnedOn)} · {absenceDays} full day
                      {absenceDays === 1 ? "" : "s"} away
                    </p>
                    {absence.notes ? <p>{absence.notes}</p> : null}
                  </div>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => onDeleteAbsence(absence.id)}
                  >
                    Delete
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <p className="absence-disclaimer">
        This tracker is for study and planning only. Immigration rules can vary by route and date, so
        always check the latest official guidance or get regulated advice before applying.
      </p>
    </section>
  );
}

function ResultsView({
  session,
  score,
  onRetake,
  onReviewWrong,
  onHome,
  currentUser,
}: ResultsViewProps) {
  const { user } = useAuth();

  return (
    <section className="results card" aria-labelledby="results-title">
      <div className="results-topline">
        <p className="eyebrow">Session complete · {currentUser.displayName}</p>
        {user ? (
          <LogoutButton />
        ) : (
          <Link className="ghost-button" to="/login">
            Log in
          </Link>
        )}
      </div>
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
