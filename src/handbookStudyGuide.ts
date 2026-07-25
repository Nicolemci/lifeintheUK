import type { Question } from "./questions";

export type StudyGuideFact = {
  id: string;
  heading: string;
  detail: string;
};

export type StudyGuideSection = {
  id: string;
  chapter: string;
  title: string;
  introduction: string;
  facts: StudyGuideFact[];
};

type SectionDefinition = Omit<StudyGuideSection, "facts"> & {
  matches: (question: Question) => boolean;
};

function handbookNumber(question: Question, area: string): number | null {
  const match = question.id.match(new RegExp(`^handbook-${area}-(\\d+)$`));
  return match ? Number(match[1]) : null;
}

function numberInRange(question: Question, area: string, start: number, end: number): boolean {
  const number = handbookNumber(question, area);
  return number !== null && number >= start && number <= end;
}

const definitions: SectionDefinition[] = [
  {
    id: "values-principles",
    chapter: "Chapter 1",
    title: "Values, principles and becoming a resident",
    introduction:
      "Fundamental British values, rights, responsibilities, citizenship requirements and the Life in the UK test.",
    matches: (question) => question.topicId === "values",
  },
  {
    id: "what-is-the-uk",
    chapter: "Chapter 2",
    title: "What is the UK?",
    introduction:
      "The four nations, Great Britain, Crown dependencies, overseas territories and the location of Parliament.",
    matches: (question) => numberInRange(question, "everyday", 1, 4),
  },
  {
    id: "early-britain",
    chapter: "Chapter 3",
    title: "Early Britain: Stone Age to the Normans",
    introduction:
      "Prehistoric Britain, the Romans, Anglo-Saxons, Christianity, Vikings and the Norman Conquest.",
    matches: (question) => numberInRange(question, "history", 1, 13),
  },
  {
    id: "middle-ages",
    chapter: "Chapter 3",
    title: "The Middle Ages",
    introduction:
      "Medieval wars, Magna Carta, Parliament, the Black Death, English language and the Wars of the Roses.",
    matches: (question) => numberInRange(question, "history", 14, 22),
  },
  {
    id: "tudors-stuarts",
    chapter: "Chapter 3",
    title: "The Tudors and Stuarts",
    introduction:
      "Religious change, Henry VIII, Elizabeth I, Shakespeare, the Civil War, Cromwell, Restoration and Glorious Revolution.",
    matches: (question) => numberInRange(question, "history", 23, 39),
  },
  {
    id: "global-power",
    chapter: "Chapter 3",
    title: "A global power",
    introduction:
      "Union, Enlightenment, Industrial Revolution, slavery and abolition, empire, democratic reform and Victorian Britain.",
    matches: (question) => numberInRange(question, "history", 40, 56),
  },
  {
    id: "twentieth-century",
    chapter: "Chapter 3",
    title: "The 20th century and Britain since 1945",
    introduction:
      "World wars, Ireland, welfare reform, migration, inventions, governments, devolution and recent events.",
    matches: (question) => numberInRange(question, "history", 57, 78),
  },
  {
    id: "arts-culture",
    chapter: "Chapter 4",
    title: "Arts, culture and literature",
    introduction:
      "Music, theatre, art, architecture, books, poetry and major cultural awards and festivals.",
    matches: (question) => numberInRange(question, "everyday", 5, 18),
  },
  {
    id: "customs-leisure",
    chapter: "Chapter 4",
    title: "Customs, festivals and leisure",
    introduction:
      "Religious festivals, national traditions, food, cinema, television, pets and everyday leisure.",
    matches: (question) => numberInRange(question, "everyday", 19, 32),
  },
  {
    id: "places-religion-sport",
    chapter: "Chapter 4",
    title: "Places, religion, sport and the UK today",
    introduction:
      "Landmarks, churches, patron saints, major sports, capitals, languages, population and equality.",
    matches: (question) => numberInRange(question, "everyday", 33, 54),
  },
  {
    id: "constitution-democracy",
    chapter: "Chapter 5",
    title: "Democracy, constitution and Parliament",
    introduction:
      "The constitution, monarchy, Commons, Lords, Speaker, elections and fundamental rights.",
    matches: (question) => numberInRange(question, "government", 1, 17),
  },
  {
    id: "law-tax-courts",
    chapter: "Chapter 5",
    title: "Rights, taxation, driving, law and courts",
    introduction:
      "Personal freedoms, forced marriage, PAYE, National Insurance, driving rules, criminal and civil law, police and courts.",
    matches: (question) => numberInRange(question, "government", 18, 32),
  },
  {
    id: "government-devolution",
    chapter: "Chapter 5",
    title: "Government, devolution and voting",
    introduction:
      "Prime Minister, cabinet, opposition, civil service, devolved administrations, Hansard and elections.",
    matches: (question) => numberInRange(question, "government", 33, 44),
  },
  {
    id: "international-community",
    chapter: "Chapter 5",
    title: "International institutions and community life",
    introduction:
      "The Commonwealth, United Nations, NATO, jury service, schools, political participation, volunteering and the environment.",
    matches: (question) => numberInRange(question, "government", 45, 54),
  },
];

function toFact(question: Question): StudyGuideFact {
  return {
    id: question.id,
    heading: question.prompt,
    detail: question.explanation,
  };
}

export function buildStudyGuide(allQuestions: Question[]): StudyGuideSection[] {
  const assigned = new Set<string>();
  const sections = definitions.map(({ matches, ...definition }) => {
    const sectionQuestions = allQuestions.filter((question) => matches(question));
    sectionQuestions.forEach((question) => assigned.add(question.id));

    return {
      ...definition,
      facts: sectionQuestions.map(toFact),
    };
  });
  const additionalFacts = allQuestions.filter((question) => !assigned.has(question.id));

  if (additionalFacts.length > 0) {
    sections.push({
      id: "additional-core-facts",
      chapter: "Core revision",
      title: "Additional key facts",
      introduction:
        "Important facts from the question bank that reinforce the main handbook chapters.",
      facts: additionalFacts.map(toFact),
    });
  }

  return sections;
}
