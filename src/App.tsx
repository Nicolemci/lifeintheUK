import { type FormEvent, useEffect, useMemo, useState } from "react";
import { questions, topics, type Question, type TopicId } from "./questions";
import {
  MOCK_DURATION_SECONDS,
  MOCK_QUESTION_COUNT,
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
  summarizeAbsences,
} from "./absence";
import "./styles.css";

type StoredProgress = {
  wrongQuestionIds: string[];
  completedSessions: number;
  bestMockScore: number;
  absences: AbsenceRecord[];
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

type AuthState = {
  user: AuthUser | null;
  progress: StoredProgress;
};

type AppTab = "study" | "absence";

const LEGACY_PROGRESS_KEY = "life-in-the-uk-prep-progress-v1";
const USERS_STORAGE_KEY = "life-in-the-uk-prep-users-v1";
const CURRENT_USER_STORAGE_KEY = "life-in-the-uk-prep-current-user-v1";

const defaultProgress: StoredProgress = {
  wrongQuestionIds: [],
  completedSessions: 0,
  bestMockScore: 0,
  absences: [],
};

function loadLegacyProgress(): StoredProgress | null {
  try {
    const savedProgress = window.localStorage.getItem(LEGACY_PROGRESS_KEY);
    return savedProgress ? { ...defaultProgress, ...JSON.parse(savedProgress) } : null;
  } catch {
    return null;
  }
}

function normalizeProfileId(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/\s+/g, " ");
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

function toAuthUser(profile: StoredUserProfile): AuthUser {
  return {
    id: profile.id,
    displayName: profile.displayName,
  };
}

function loadInitialAuthState(): AuthState {
  try {
    const currentUserId = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    const profiles = loadProfiles();
    const profile = currentUserId ? profiles[currentUserId] : undefined;

    if (profile) {
      return {
        user: toAuthUser(profile),
        progress: { ...defaultProgress, ...profile.progress },
      };
    }
  } catch {
    return {
      user: null,
      progress: defaultProgress,
    };
  }

  return {
    user: null,
    progress: defaultProgress,
  };
}

function loginToLocalProfile(displayName: string): AuthState | null {
  const trimmedName = displayName.trim();
  const profileId = normalizeProfileId(trimmedName);

  if (!profileId) {
    return null;
  }

  const profiles = loadProfiles();
  const existingProfile = profiles[profileId];
  const now = new Date().toISOString();
  const legacyProgress = Object.keys(profiles).length === 0 ? loadLegacyProgress() : null;
  const progress = existingProfile?.progress ?? legacyProgress ?? defaultProgress;
  const profile: StoredUserProfile = {
    id: profileId,
    displayName: trimmedName,
    createdAt: existingProfile?.createdAt ?? now,
    lastLoginAt: now,
    progress: { ...defaultProgress, ...progress },
  };

  profiles[profileId] = profile;
  saveProfiles(profiles);

  try {
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, profile.id);
  } catch {
    // If the browser blocks storage, the app can still run for the current session.
  }

  return {
    user: toAuthUser(profile),
    progress: profile.progress,
  };
}

function saveProgressForUser(userId: string, progress: StoredProgress) {
  const profiles = loadProfiles();
  const profile = profiles[userId];

  if (!profile) {
    return;
  }

  profiles[userId] = {
    ...profile,
    progress,
  };
  saveProfiles(profiles);
}

function clearCurrentUser() {
  try {
    window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  } catch {
    // Storage errors should not prevent signing out of the in-memory session.
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
    absences: progress.absences,
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
  const [initialAuthState] = useState<AuthState>(() => loadInitialAuthState());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(initialAuthState.user);
  const [progress, setProgress] = useState<StoredProgress>(initialAuthState.progress);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("study");

  const wrongQuestions = useMemo(() => {
    const wrongQuestionIds = new Set(progress.wrongQuestionIds);
    return questions.filter((question) => wrongQuestionIds.has(question.id));
  }, [progress.wrongQuestionIds]);
  const mockTestSets = useMemo(() => createMockTestSets(questions), []);
  const absenceSummary = useMemo(() => summarizeAbsences(progress.absences), [progress.absences]);

  const currentQuestion = session?.questions[session.currentIndex];
  const isCompleted = Boolean(session?.completedAt && score);
  const isPracticeMode = session?.mode === "topic" || session?.mode === "wrong";

  useEffect(() => {
    if (currentUser) {
      saveProgressForUser(currentUser.id, progress);
    }
  }, [currentUser, progress]);

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
    setSession(createSession("mock", "Random timed mock test", selectedQuestions));
    setScore(null);
  }

  function startMockTestSet(testSetIndex: number) {
    const testSet = mockTestSets[testSetIndex];

    if (!testSet) {
      return;
    }

    setSession(createSession("mock", testSet.title, testSet.questions));
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
    setActiveTab("study");
  }

  function handleLogin(displayName: string) {
    const authState = loginToLocalProfile(displayName);

    if (!authState) {
      return;
    }

    setCurrentUser(authState.user);
    setProgress(authState.progress);
    resetToHome();
  }

  function handleSignOut() {
    clearCurrentUser();
    setCurrentUser(null);
    setProgress(defaultProgress);
    setActiveTab("study");
    resetToHome();
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

  if (!currentUser) {
    return (
      <main className="app-shell">
        <LoginView onLogin={handleLogin} />
      </main>
    );
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
          currentUser={currentUser}
          onSignOut={handleSignOut}
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
              <button className="ghost-button" type="button" onClick={handleSignOut}>
                Sign out
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

  if (activeTab === "absence") {
    return (
      <main className="app-shell">
        <AppTabs
          activeTab={activeTab}
          currentUser={currentUser}
          onChange={switchTab}
          onSignOut={handleSignOut}
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

  return (
    <main className="app-shell">
      <AppTabs
        activeTab={activeTab}
        currentUser={currentUser}
        onChange={switchTab}
        onSignOut={handleSignOut}
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
          <div className="royal-badge" aria-hidden="true">
            UK
          </div>
          <div className="profile-summary">
            <span>Signed in as</span>
            <strong className="profile-name">{currentUser.displayName}</strong>
            <button className="ghost-button" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
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

      <section className="mock-bank-section" aria-labelledby="mock-bank-title">
        <div className="section-heading">
          <p className="eyebrow">Full question coverage</p>
          <h2 id="mock-bank-title">{mockTestSets.length} numbered mock tests cover every question</h2>
          <p>
            Work through these in order to see the whole question bank. Each mock uses the real
            45-minute timer and 24-question format; the final mock is topped up if needed so it still
            feels like the real test.
          </p>
        </div>
        <div className="mock-test-grid">
          {mockTestSets.map((testSet, index) => (
            <article className="card mock-test-card" key={testSet.id}>
              <span className="mock-number">{index + 1}</span>
              <div>
                <h3>{testSet.title}</h3>
                <p>
                  Covers questions {testSet.questionRangeLabel}
                  {testSet.coveredQuestionCount < MOCK_QUESTION_COUNT
                    ? `, plus ${MOCK_QUESTION_COUNT - testSet.coveredQuestionCount} review questions`
                    : ""}
                  .
                </p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => startMockTestSet(index)}
              >
                Start {testSet.title.toLowerCase()}
              </button>
            </article>
          ))}
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
  onSignOut: () => void;
};

function LoginView({ onLogin }: { onLogin: (displayName: string) => void }) {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!displayName.trim()) {
      setError("Enter your name to save progress.");
      return;
    }

    setError("");
    onLogin(displayName);
  }

  return (
    <section className="login-layout" aria-labelledby="login-title">
      <div>
        <p className="british-kicker">Union-ready study</p>
        <h1 id="login-title">Sign in to save your progress.</h1>
        <p>
          Create a local study profile or return with the same name to continue your best score,
          wrong-question list, and completed sessions on this browser.
        </p>
      </div>
      <form className="card login-card" onSubmit={handleSubmit}>
        <label htmlFor="display-name">Your name</label>
        <input
          id="display-name"
          autoComplete="name"
          placeholder="e.g. Nicole"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit">
          Continue
        </button>
        <p className="login-note">
          This first version saves profiles on this device only. A real email/password account would
          need a backend service.
        </p>
      </form>
    </section>
  );
}

type AppTabsProps = {
  activeTab: AppTab;
  currentUser: AuthUser;
  onChange: (tab: AppTab) => void;
  onSignOut: () => void;
};

function AppTabs({ activeTab, currentUser, onChange, onSignOut }: AppTabsProps) {
  return (
    <nav className="app-tabs card" aria-label="Main app sections">
      <div className="tab-group" role="tablist" aria-label="Choose app section">
        <button
          className={["tab-button", activeTab === "study" ? "active" : ""].filter(Boolean).join(" ")}
          type="button"
          role="tab"
          aria-selected={activeTab === "study"}
          onClick={() => onChange("study")}
        >
          Study
        </button>
        <button
          className={["tab-button", activeTab === "absence" ? "active" : ""].filter(Boolean).join(" ")}
          type="button"
          role="tab"
          aria-selected={activeTab === "absence"}
          onClick={() => onChange("absence")}
        >
          Away tracker
        </button>
      </div>
      <div className="tab-profile">
        <span>{currentUser.displayName}</span>
        <button className="ghost-button" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

type AbsenceTrackerProps = {
  absences: AbsenceRecord[];
  summary: ReturnType<typeof summarizeAbsences>;
  onAddAbsence: (absence: Omit<AbsenceRecord, "id">) => void;
  onDeleteAbsence: (absenceId: string) => void;
};

function formatDateForDisplay(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function AbsenceTracker({ absences, summary, onAddAbsence, onDeleteAbsence }: AbsenceTrackerProps) {
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("Holiday");
  const [departedOn, setDepartedOn] = useState("");
  const [returnedOn, setReturnedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!destination.trim() || !departedOn || !returnedOn) {
      setError("Add a destination plus departure and return dates.");
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
    setDepartedOn("");
    setReturnedOn("");
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
                type="date"
                value={departedOn}
                onChange={(event) => setDepartedOn(event.target.value)}
              />
            </label>
            <label>
              Returned to the UK
              <input
                type="date"
                value={returnedOn}
                onChange={(event) => setReturnedOn(event.target.value)}
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
                      {formatDateForDisplay(absence.departedOn)} to{" "}
                      {formatDateForDisplay(absence.returnedOn)} · {absenceDays} full day
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
  onSignOut,
}: ResultsViewProps) {
  return (
    <section className="results card" aria-labelledby="results-title">
      <div className="results-topline">
        <p className="eyebrow">Session complete · {currentUser.displayName}</p>
        <button className="ghost-button" type="button" onClick={onSignOut}>
          Sign out
        </button>
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
