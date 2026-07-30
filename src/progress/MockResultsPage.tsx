import { Link } from "react-router-dom";
import { useProgress } from "./ProgressContext";

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatDuration(durationSeconds: number): string {
  if (durationSeconds === 0) {
    return "Duration unavailable";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function MockResultsPage() {
  const { loading, error, stats, mockTestHistory, refreshProgress } = useProgress();

  return (
    <main className="results-history-page">
      <header className="results-history-hero">
        <Link className="ghost-button" to="/">
          Back to study
        </Link>
        <p className="british-kicker">Your progress</p>
        <h1>Previous mock-test results</h1>
        <p>Review completed tests and see how your scores are developing over time.</p>
      </header>

      <section className="results-summary-grid" aria-label="Mock test summary">
        <article className="card">
          <span>Tests completed</span>
          <strong>{loading ? "—" : stats.mockTestsCompleted}</strong>
        </article>
        <article className="card">
          <span>Average score</span>
          <strong>{loading ? "—" : `${stats.averageScore}%`}</strong>
        </article>
        <article className="card">
          <span>Best score</span>
          <strong>{loading ? "—" : `${stats.bestScore}%`}</strong>
        </article>
      </section>

      {error ? (
        <section className="card results-history-error">
          <p className="form-error">{error}</p>
          <button className="secondary-button" type="button" onClick={() => void refreshProgress()}>
            Try again
          </button>
        </section>
      ) : null}

      {loading ? <p className="empty-state">Loading your previous results…</p> : null}
      {!loading && !error && mockTestHistory.length === 0 ? (
        <section className="card results-history-empty">
          <h2>No completed mock tests yet</h2>
          <p>Your results will appear here after you finish your first mock test.</p>
          <Link className="primary-button" to="/">
            Start studying
          </Link>
        </section>
      ) : null}

      {!loading && mockTestHistory.length > 0 ? (
        <section className="results-history-list" aria-label="Completed mock tests">
          {mockTestHistory.map((result, index) => (
            <article className="card result-history-card" key={result.id}>
              <span className="mock-number">{mockTestHistory.length - index}</span>
              <div>
                <p className="eyebrow">Mock test</p>
                <h2>{result.percentage}%</h2>
                <p>
                  {result.score}/24 correct · {formatDuration(result.durationSeconds)}
                </p>
                <time dateTime={result.completedAt}>{formatDate(result.completedAt)}</time>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
