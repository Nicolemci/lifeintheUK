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
  categories: string[];
};

const definitions: SectionDefinition[] = [
  {
    id: "values-principles",
    chapter: "Chapter 1",
    title: "Values, principles and becoming a resident",
    introduction:
      "Fundamental British values, rights, responsibilities, citizenship requirements and the Life in the UK test.",
    categories: ["Values and principles"],
  },
  {
    id: "what-is-the-uk",
    chapter: "Chapter 2",
    title: "What is the UK?",
    introduction:
      "The four nations, Great Britain, Crown dependencies, overseas territories and the location of Parliament.",
    categories: ["What is the UK"],
  },
  {
    id: "early-britain",
    chapter: "Chapter 3",
    title: "Early Britain: Stone Age to the Normans",
    introduction:
      "Prehistoric Britain, the Romans, Anglo-Saxons, Christianity, Vikings and the Norman Conquest.",
    categories: ["Early Britain"],
  },
  {
    id: "middle-ages",
    chapter: "Chapter 3",
    title: "The Middle Ages",
    introduction:
      "Medieval wars, Magna Carta, Parliament, the Black Death, English language and the Wars of the Roses.",
    categories: ["The Middle Ages"],
  },
  {
    id: "tudors-stuarts",
    chapter: "Chapter 3",
    title: "The Tudors and Stuarts",
    introduction:
      "Religious change, Henry VIII, Elizabeth I, Shakespeare, the Civil War, Cromwell, Restoration and Glorious Revolution.",
    categories: ["The Tudors and Stuarts"],
  },
  {
    id: "global-power",
    chapter: "Chapter 3",
    title: "A global power",
    introduction:
      "Union, Enlightenment, Industrial Revolution, slavery and abolition, empire, democratic reform and Victorian Britain.",
    categories: ["A global power"],
  },
  {
    id: "twentieth-century",
    chapter: "Chapter 3",
    title: "The 20th century",
    introduction: "World wars, Ireland, welfare reform, migration, inventions and major 20th-century events.",
    categories: ["The 20th century"],
  },
  {
    id: "britain-since-1945",
    chapter: "Chapter 3",
    title: "Britain since 1945",
    introduction: "Post-war Britain, governments, devolution, the EU/Brexit and recent political change.",
    categories: ["Britain since 1945"],
  },
  {
    id: "arts-culture",
    chapter: "Chapter 4",
    title: "Arts, culture and literature",
    introduction:
      "Music, theatre, art, architecture, books, poetry and major cultural awards and festivals.",
    categories: ["Arts and culture"],
  },
  {
    id: "customs-leisure",
    chapter: "Chapter 4",
    title: "Customs, festivals and leisure",
    introduction:
      "Religious festivals, national traditions, food, cinema, television, pets and everyday leisure.",
    categories: ["Customs and traditions", "Leisure"],
  },
  {
    id: "places-religion-sport",
    chapter: "Chapter 4",
    title: "Places, religion, sport and the UK today",
    introduction:
      "Landmarks, churches, patron saints, major sports, capitals, languages, population and equality.",
    categories: ["Places of interest", "Religion", "Sport", "The UK today"],
  },
  {
    id: "constitution-democracy",
    chapter: "Chapter 5",
    title: "Democracy, constitution and Government",
    introduction:
      "The constitution, monarchy, Commons, Lords, Speaker, elections and fundamental rights.",
    categories: ["Government and constitution"],
  },
  {
    id: "law-tax-courts",
    chapter: "Chapter 5",
    title: "Rights, taxation, driving, law and courts",
    introduction:
      "Personal freedoms, forced marriage, PAYE, National Insurance, driving rules, criminal and civil law, police and courts.",
    categories: ["The law and courts", "Rights, tax and driving"],
  },
  {
    id: "international-community",
    chapter: "Chapter 5",
    title: "International institutions and community life",
    introduction:
      "The Commonwealth, United Nations, NATO, jury service, schools, political participation, volunteering and the environment.",
    categories: ["International institutions", "Your role in the community"],
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
  const sections = definitions.map(({ categories, ...definition }) => {
    const categorySet = new Set(categories);
    const sectionQuestions = allQuestions.filter((question) => categorySet.has(question.category));
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
