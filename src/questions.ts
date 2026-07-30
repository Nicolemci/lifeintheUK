import questionBank from "./data/life-in-the-uk-questions.json";

export type TopicId = "values" | "history" | "government" | "everyday-life";

export type Question = {
  id: string;
  topicId: TopicId;
  topic: string;
  category: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  optionExplanations?: Array<string | undefined>;
};

export const topics: Array<{ id: TopicId; name: string; description: string }> = [
  {
    id: "values",
    name: "UK values and society",
    description: "Democracy, rule of law, individual liberty, tolerance, and community life.",
  },
  {
    id: "history",
    name: "History and traditions",
    description: "Key events, historic documents, national symbols, and cultural milestones.",
  },
  {
    id: "government",
    name: "Government and the law",
    description: "Parliament, elections, devolved government, courts, and civic duties.",
  },
  {
    id: "everyday-life",
    name: "Everyday life in the UK",
    description: "Public services, geography, education, work, charities, and customs.",
  },
];

const categoryTopicIds: Record<string, TopicId> = {
  "Values and principles": "values",
  "What is the UK": "everyday-life",
  "Early Britain": "history",
  "The Middle Ages": "history",
  "The Tudors and Stuarts": "history",
  "A global power": "history",
  "The 20th century": "history",
  "Britain since 1945": "history",
  "Arts and culture": "everyday-life",
  "Customs and traditions": "everyday-life",
  Leisure: "everyday-life",
  "Places of interest": "everyday-life",
  Religion: "everyday-life",
  Sport: "everyday-life",
  "The UK today": "everyday-life",
  "Government and constitution": "government",
  "The law and courts": "government",
  "Rights, tax and driving": "government",
  "International institutions": "government",
  "Your role in the community": "values",
};

const topicNames = Object.fromEntries(topics.map((topic) => [topic.id, topic.name])) as Record<
  TopicId,
  string
>;

type ImportedQuestion = {
  id: number;
  category: string;
  question: string;
  options: string[];
  answer: string;
  answerIndex: number;
  explanation: string;
};

function toQuestion(raw: ImportedQuestion): Question {
  const topicId = categoryTopicIds[raw.category] ?? "everyday-life";

  if (raw.options[raw.answerIndex] !== raw.answer) {
    throw new Error(`Question ${raw.id} answer does not match answerIndex.`);
  }

  return {
    id: String(raw.id),
    topicId,
    topic: topicNames[topicId],
    category: raw.category,
    prompt: raw.question,
    options: raw.options,
    correctIndex: raw.answerIndex,
    explanation: raw.explanation,
  };
}

export const questionBankMeta = questionBank.meta;

export const questions: Question[] = (questionBank.questions as ImportedQuestion[]).map(toQuestion);
