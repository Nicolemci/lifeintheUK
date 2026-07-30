import { type FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type {
  AdminQuestion,
  QuestionCategory,
  QuestionInput,
  QuestionStatus,
} from "./questionService";
import { validateQuestionInput } from "./questionService";

type QuestionEditorProps = {
  question: AdminQuestion | null;
  categories: QuestionCategory[];
  saving: boolean;
  onSave: (input: QuestionInput) => Promise<void>;
  onCancel: () => void;
};

const emptyOptions: [string, string, string, string] = ["", "", "", ""];

export default function QuestionEditor({
  question,
  categories,
  saving,
  onSave,
  onCancel,
}: QuestionEditorProps) {
  const explanationRef = useRef<HTMLTextAreaElement>(null);
  const [externalId, setExternalId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<[string, string, string, string]>(emptyOptions);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanationMarkdown, setExplanationMarkdown] = useState("");
  const [status, setStatus] = useState<QuestionStatus>("draft");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setExternalId(question?.externalId ?? "");
    setCategoryId(question?.categoryId ?? categories[0]?.id ?? "");
    setPrompt(question?.prompt ?? "");
    setOptions(question?.options ?? ["", "", "", ""]);
    setCorrectIndex(question?.correctIndex ?? 0);
    setExplanationMarkdown(question?.explanationMarkdown ?? "");
    setStatus(question?.status ?? "draft");
    setErrors([]);
  }, [question, categories]);

  function updateOption(index: number, value: string) {
    setOptions((current) => {
      const next = [...current] as [string, string, string, string];
      next[index] = value;
      return next;
    });
  }

  function applyMarkdown(prefix: string, suffix = prefix) {
    const textarea = explanationRef.current;

    if (!textarea) {
      setExplanationMarkdown((current) => `${current}${prefix}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = explanationMarkdown.slice(start, end) || "text";
    const next =
      explanationMarkdown.slice(0, start) +
      prefix +
      selected +
      suffix +
      explanationMarkdown.slice(end);
    setExplanationMarkdown(next);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: QuestionInput = {
      externalId,
      categoryId,
      prompt,
      options,
      correctIndex,
      explanationMarkdown,
      status,
    };
    const validationErrors = validateQuestionInput(input);
    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      await onSave(input);
    }
  }

  return (
    <section className="card question-editor" aria-labelledby="question-editor-title">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">{question ? "Edit question" : "New question"}</p>
          <h2 id="question-editor-title">
            {question ? question.externalId : "Create a question"}
          </h2>
        </div>
        <button className="ghost-button" type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <form className="admin-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="admin-form-grid">
          <label>
            External ID
            <input
              value={externalId}
              onChange={(event) => setExternalId(event.target.value.toLowerCase())}
              placeholder="history-magna-carta-001"
              disabled={saving}
            />
          </label>
          <label>
            Category
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={saving}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Question prompt
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            disabled={saving}
          />
        </label>

        <fieldset className="option-editor">
          <legend>Answer options</legend>
          {options.map((option, index) => (
            <label className="option-editor-row" key={index}>
              <input
                type="radio"
                name="correct-option"
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                disabled={saving}
                aria-label={`Mark option ${index + 1} correct`}
              />
              <span>{String.fromCharCode(65 + index)}</span>
              <input
                value={option}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Option ${index + 1}`}
                disabled={saving}
              />
            </label>
          ))}
          <small>Select the radio button beside the correct answer.</small>
        </fieldset>

        <label>
          Explanation
          <div className="markdown-toolbar" aria-label="Explanation formatting">
            <button type="button" onClick={() => applyMarkdown("**")} disabled={saving}>
              Bold
            </button>
            <button type="button" onClick={() => applyMarkdown("*")} disabled={saving}>
              Italic
            </button>
            <button type="button" onClick={() => applyMarkdown("## ", "")} disabled={saving}>
              Heading
            </button>
            <button type="button" onClick={() => applyMarkdown("- ", "")} disabled={saving}>
              List
            </button>
          </div>
          <textarea
            ref={explanationRef}
            value={explanationMarkdown}
            onChange={(event) => setExplanationMarkdown(event.target.value)}
            rows={8}
            disabled={saving}
          />
        </label>

        <div className="markdown-preview">
          <p className="eyebrow">Safe Markdown preview</p>
          {explanationMarkdown ? (
            <ReactMarkdown>{explanationMarkdown}</ReactMarkdown>
          ) : (
            <p className="empty-state">Your formatted explanation preview appears here.</p>
          )}
        </div>

        <label>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as QuestionStatus)}
            disabled={saving}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>

        {errors.length > 0 ? (
          <ul className="form-error admin-validation-errors">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}

        <div className="hero-actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving…" : question ? "Save changes" : "Create question"}
          </button>
          <button className="ghost-button" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
