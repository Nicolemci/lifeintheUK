export type QuestionStatus = "draft" | "published";

export type QuestionCategory = {
  id: string;
  name: string;
  slug: string;
};

export type AdminQuestion = {
  id: string;
  externalId: string;
  categoryId: string;
  category: QuestionCategory | null;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanationMarkdown: string;
  status: QuestionStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type QuestionInput = {
  externalId: string;
  categoryId: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanationMarkdown: string;
  status: QuestionStatus;
};

export type QuestionFilters = {
  search: string;
  categoryId: string;
  status: QuestionStatus | "all";
  page: number;
  pageSize: number;
};

export type AuditEntry = {
  id: number;
  questionExternalId: string;
  adminUserId: string | null;
  action: "create" | "update" | "delete";
  oldRecord: Record<string, unknown> | null;
  newRecord: Record<string, unknown> | null;
  createdAt: string;
};

export type BulkQuestionRecord = {
  external_id: string;
  category_slug: string;
  prompt: string;
  options: [string, string, string, string];
  correct_index: number;
  explanation_markdown: string;
  status: QuestionStatus;
};

type QuestionRow = {
  id: string;
  external_id: string;
  category_id: string;
  prompt: string;
  options: unknown;
  correct_index: number;
  explanation_markdown: string;
  status: QuestionStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  category?: QuestionCategory | QuestionCategory[] | null;
};

async function loadSupabaseClient() {
  const { getSupabaseClient } = await import("../lib/supabase");
  return getSupabaseClient();
}

function normalizeOptions(options: unknown): [string, string, string, string] {
  if (
    !Array.isArray(options) ||
    options.length !== 4 ||
    options.some((option) => typeof option !== "string")
  ) {
    throw new Error("Question options are not a valid four-item string array.");
  }

  return options as [string, string, string, string];
}

function normalizeQuestion(row: QuestionRow): AdminQuestion {
  const category = Array.isArray(row.category) ? row.category[0] ?? null : row.category ?? null;

  return {
    id: row.id,
    externalId: row.external_id,
    categoryId: row.category_id,
    category,
    prompt: row.prompt,
    options: normalizeOptions(row.options),
    correctIndex: row.correct_index,
    explanationMarkdown: row.explanation_markdown,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function questionInputRow(input: QuestionInput) {
  return {
    external_id: input.externalId.trim(),
    category_id: input.categoryId,
    prompt: input.prompt.trim(),
    options: input.options.map((option) => option.trim()),
    correct_index: input.correctIndex,
    explanation_markdown: input.explanationMarkdown.trim(),
    status: input.status,
  };
}

export function validateQuestionInput(input: QuestionInput): string[] {
  const errors: string[] = [];

  if (!/^[a-z0-9][a-z0-9_-]{2,119}$/.test(input.externalId.trim())) {
    errors.push("External ID must use 3-120 lowercase letters, numbers, underscores, or hyphens.");
  }
  if (!input.categoryId) {
    errors.push("Category is required.");
  }
  if (!input.prompt.trim()) {
    errors.push("Question prompt is required.");
  }
  if (input.options.some((option) => !option.trim())) {
    errors.push("All four answer options are required.");
  }
  if (!Number.isInteger(input.correctIndex) || input.correctIndex < 0 || input.correctIndex > 3) {
    errors.push("Correct answer index must be between 0 and 3.");
  }
  if (!input.explanationMarkdown.trim()) {
    errors.push("Explanation is required.");
  }

  return errors;
}

export async function listCategories(): Promise<QuestionCategory[]> {
  const supabase = await loadSupabaseClient();
  const { data, error } = await supabase
    .from("question_categories")
    .select("id, name, slug")
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []) as QuestionCategory[];
}

export async function createCategory(name: string, slug: string): Promise<QuestionCategory> {
  const supabase = await loadSupabaseClient();
  const { data, error } = await supabase
    .from("question_categories")
    .insert({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
    })
    .select("id, name, slug")
    .single();

  if (error) {
    throw error;
  }

  return data as QuestionCategory;
}

export async function listQuestions(filters: QuestionFilters): Promise<{
  questions: AdminQuestion[];
  total: number;
}> {
  const supabase = await loadSupabaseClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  let query = supabase
    .from("questions")
    .select(
      "id, external_id, category_id, prompt, options, correct_index, explanation_markdown, status, created_at, updated_at, published_at, category:question_categories(id, name, slug)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters.search.trim()) {
    query = query.ilike("prompt", `%${filters.search.trim()}%`);
  }
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    questions: ((data ?? []) as unknown as QuestionRow[]).map(normalizeQuestion),
    total: count ?? 0,
  };
}

export async function createQuestion(input: QuestionInput): Promise<AdminQuestion> {
  const errors = validateQuestionInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const supabase = await loadSupabaseClient();
  const { data, error } = await supabase
    .from("questions")
    .insert(questionInputRow(input))
    .select(
      "id, external_id, category_id, prompt, options, correct_index, explanation_markdown, status, created_at, updated_at, published_at, category:question_categories(id, name, slug)",
    )
    .single();

  if (error) {
    throw error;
  }

  return normalizeQuestion(data as unknown as QuestionRow);
}

export async function updateQuestion(
  questionId: string,
  input: QuestionInput,
): Promise<AdminQuestion> {
  const errors = validateQuestionInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const supabase = await loadSupabaseClient();
  const { data, error } = await supabase
    .from("questions")
    .update(questionInputRow(input))
    .eq("id", questionId)
    .select(
      "id, external_id, category_id, prompt, options, correct_index, explanation_markdown, status, created_at, updated_at, published_at, category:question_categories(id, name, slug)",
    )
    .single();

  if (error) {
    throw error;
  }

  return normalizeQuestion(data as unknown as QuestionRow);
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const supabase = await loadSupabaseClient();
  const { error } = await supabase.from("questions").delete().eq("id", questionId);

  if (error) {
    throw error;
  }
}

export function validateBulkQuestionRecord(value: unknown): value is BulkQuestionRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<BulkQuestionRecord>;
  return (
    typeof record.external_id === "string" &&
    typeof record.category_slug === "string" &&
    typeof record.prompt === "string" &&
    Array.isArray(record.options) &&
    record.options.length === 4 &&
    record.options.every((option) => typeof option === "string" && option.trim()) &&
    Number.isInteger(record.correct_index) &&
    (record.correct_index ?? -1) >= 0 &&
    (record.correct_index ?? 4) <= 3 &&
    typeof record.explanation_markdown === "string" &&
    (record.status === "draft" || record.status === "published")
  );
}

export async function importQuestions(records: unknown[]): Promise<number> {
  if (records.length === 0) {
    throw new Error("The import file does not contain any questions.");
  }
  if (!records.every(validateBulkQuestionRecord)) {
    throw new Error("One or more imported questions have an invalid structure.");
  }

  const categories = await listCategories();
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const rows = records.map((record) => {
    const categoryId = categoryBySlug.get(record.category_slug);

    if (!categoryId) {
      throw new Error(`Unknown category slug: ${record.category_slug}`);
    }

    return {
      external_id: record.external_id.trim(),
      category_id: categoryId,
      prompt: record.prompt.trim(),
      options: record.options.map((option) => option.trim()),
      correct_index: record.correct_index,
      explanation_markdown: record.explanation_markdown.trim(),
      status: record.status,
    };
  });
  const supabase = await loadSupabaseClient();
  const chunkSize = 200;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const { error } = await supabase
      .from("questions")
      .upsert(rows.slice(index, index + chunkSize), { onConflict: "external_id" });

    if (error) {
      throw error;
    }
  }

  return rows.length;
}

export async function exportQuestions(): Promise<BulkQuestionRecord[]> {
  const supabase = await loadSupabaseClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      "external_id, prompt, options, correct_index, explanation_markdown, status, category:question_categories(slug)",
    )
    .order("external_id")
    .range(0, 9999);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const categoryValue = row.category as unknown as { slug: string } | { slug: string }[] | null;
    const category = Array.isArray(categoryValue) ? categoryValue[0] : categoryValue;

    return {
      external_id: row.external_id,
      category_slug: category?.slug ?? "",
      prompt: row.prompt,
      options: normalizeOptions(row.options),
      correct_index: row.correct_index,
      explanation_markdown: row.explanation_markdown,
      status: row.status as QuestionStatus,
    };
  });
}

export async function listAuditEntries(limit = 100): Promise<AuditEntry[]> {
  const supabase = await loadSupabaseClient();
  const { data, error } = await supabase
    .from("question_audit_log")
    .select(
      "id, question_external_id, admin_user_id, action, old_record, new_record, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    questionExternalId: row.question_external_id,
    adminUserId: row.admin_user_id,
    action: row.action as AuditEntry["action"],
    oldRecord: row.old_record as Record<string, unknown> | null,
    newRecord: row.new_record as Record<string, unknown> | null,
    createdAt: row.created_at,
  }));
}
