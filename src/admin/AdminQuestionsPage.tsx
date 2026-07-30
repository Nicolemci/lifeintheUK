import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import LogoutButton from "../auth/LogoutButton";
import QuestionEditor from "./QuestionEditor";
import {
  type AdminQuestion,
  type AuditEntry,
  createCategory,
  createQuestion,
  deleteQuestion,
  exportQuestions,
  importQuestions,
  listAuditEntries,
  listCategories,
  listQuestions,
  type QuestionCategory,
  type QuestionInput,
  type QuestionStatus,
  updateQuestion,
} from "./questionService";

const PAGE_SIZE = 20;

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function AdminQuestionsPage() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"questions" | "audit">("questions");
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<QuestionStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");

  const loadQuestionPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await listQuestions({
        search: deferredSearch,
        categoryId,
        status,
        page,
        pageSize: PAGE_SIZE,
      });
      setQuestions(result.questions);
      setTotal(result.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load questions.");
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, categoryId, status, page]);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setAuditEntries(await listAuditEntries());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load audit history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void listCategories()
      .then(setCategories)
      .catch((categoryError: unknown) => {
        setError(
          categoryError instanceof Error ? categoryError.message : "Unable to load categories.",
        );
      });
  }, []);

  useEffect(() => {
    if (view === "questions") {
      void loadQuestionPage();
    } else {
      void loadAudit();
    }
  }, [view, loadQuestionPage, loadAudit]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, categoryId, status]);

  async function saveQuestion(input: QuestionInput) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, input);
        setNotice("Question updated.");
      } else {
        await createQuestion(input);
        setNotice("Question created.");
      }

      setEditorOpen(false);
      setEditingQuestion(null);
      await loadQuestionPage();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save question.");
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(question: AdminQuestion) {
    if (!window.confirm(`Delete ${question.externalId}? This action is recorded in the audit log.`)) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteQuestion(question.id);
      setNotice("Question deleted.");
      await loadQuestionPage();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete question.");
    } finally {
      setSaving(false);
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const category = await createCategory(categoryName, categorySlug);
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryName("");
      setCategorySlug("");
      setNotice("Category created.");
    } catch (categoryError) {
      setError(
        categoryError instanceof Error ? categoryError.message : "Unable to create category.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const records = Array.isArray(parsed)
        ? parsed
        : (parsed as { questions?: unknown[] } | null)?.questions;

      if (!Array.isArray(records)) {
        throw new Error("Import JSON must be an array or an object with a questions array.");
      }

      const importedCount = await importQuestions(records);
      setNotice(`${importedCount} question${importedCount === 1 ? "" : "s"} imported.`);
      await loadQuestionPage();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import questions.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setSaving(true);
    setError("");

    try {
      const exported = await exportQuestions();
      downloadJson("life-in-the-uk-questions.json", {
        exported_at: new Date().toISOString(),
        questions: exported,
      });
      setNotice(`${exported.length} questions exported.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export questions.");
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="british-kicker">Secure administration</p>
          <h1>Question dashboard</h1>
          <p>Create, review, publish, import and audit Life in the UK questions.</p>
        </div>
        <div className="admin-header-actions">
          <Link className="ghost-button" to="/">
            Learner app
          </Link>
          <LogoutButton />
        </div>
      </header>

      <nav className="admin-view-tabs" aria-label="Admin dashboard views">
        <button
          className={view === "questions" ? "active" : ""}
          type="button"
          onClick={() => setView("questions")}
        >
          Questions
        </button>
        <button
          className={view === "audit" ? "active" : ""}
          type="button"
          onClick={() => setView("audit")}
        >
          Audit trail
        </button>
      </nav>

      {error ? <p className="form-error admin-message">{error}</p> : null}
      {notice ? <p className="form-success admin-message">{notice}</p> : null}

      {view === "questions" ? (
        <>
          <section className="card admin-toolbar">
            <div className="admin-filters">
              <label>
                Search
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search question text"
                />
              </label>
              <label>
                Category
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as QuestionStatus | "all")}
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
            </div>
            <div className="admin-toolbar-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setEditorOpen(true);
                }}
              >
                New question
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={saving}
              >
                Import JSON
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void handleExport()}
                disabled={saving}
              >
                Export JSON
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(event) => void handleImport(event)}
                hidden
              />
            </div>
          </section>

          <section className="card category-creator">
            <form onSubmit={(event) => void addCategory(event)}>
              <strong>Add category</strong>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Category name"
                required
              />
              <input
                value={categorySlug}
                onChange={(event) => setCategorySlug(event.target.value.toLowerCase())}
                placeholder="category-slug"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
              <button className="ghost-button" type="submit" disabled={saving}>
                Add
              </button>
            </form>
          </section>

          {editorOpen ? (
            <QuestionEditor
              question={editingQuestion}
              categories={categories}
              saving={saving}
              onSave={saveQuestion}
              onCancel={() => {
                setEditorOpen(false);
                setEditingQuestion(null);
              }}
            />
          ) : null}

          <section className="admin-question-list" aria-label="Questions">
            {loading ? <p className="empty-state">Loading questions…</p> : null}
            {!loading && questions.length === 0 ? (
              <article className="card admin-empty">
                <h2>No questions found</h2>
                <p>Create a question or change the current filters.</p>
              </article>
            ) : null}
            {questions.map((question) => (
              <article className="card admin-question-card" key={question.id}>
                <div className="admin-question-main">
                  <div className="admin-question-meta">
                    <span className={`question-status ${question.status}`}>{question.status}</span>
                    <span>{question.category?.name ?? "Uncategorised"}</span>
                    <code>{question.externalId}</code>
                  </div>
                  <h2>{question.prompt}</h2>
                  <ol type="A">
                    {question.options.map((option, index) => (
                      <li className={index === question.correctIndex ? "correct" : ""} key={option}>
                        {option}
                      </li>
                    ))}
                  </ol>
                  <small>Updated {formatDate(question.updatedAt)}</small>
                </div>
                <div className="admin-question-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setEditingQuestion(question);
                      setEditorOpen(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="ghost-button danger"
                    type="button"
                    onClick={() => void removeQuestion(question)}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </section>

          <nav className="admin-pagination" aria-label="Question pages">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages} · {total} questions
            </span>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
            >
              Next
            </button>
          </nav>
        </>
      ) : (
        <section className="admin-audit-list" aria-label="Question audit trail">
          {loading ? <p className="empty-state">Loading audit history…</p> : null}
          {!loading && auditEntries.length === 0 ? (
            <article className="card admin-empty">
              <h2>No audit events yet</h2>
              <p>Question changes will appear here automatically.</p>
            </article>
          ) : null}
          {auditEntries.map((entry) => (
            <article className="card audit-entry" key={entry.id}>
              <span className={`question-status ${entry.action}`}>{entry.action}</span>
              <div>
                <h2>{entry.questionExternalId}</h2>
                <p>
                  {entry.adminUserId ? `Admin ${entry.adminUserId}` : "Trusted server"} ·{" "}
                  {formatDate(entry.createdAt)}
                </p>
              </div>
              <details>
                <summary>View change data</summary>
                <pre>
                  {JSON.stringify(
                    {
                      before: entry.oldRecord,
                      after: entry.newRecord,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
