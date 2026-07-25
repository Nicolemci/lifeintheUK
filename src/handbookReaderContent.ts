export type HandbookReaderSection = {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  bullets: string[];
};

export const handbookReaderSections: HandbookReaderSection[] = [
  {
    id: "values",
    kicker: "Chapter 1",
    title: "Values and principles of the UK",
    summary:
      "The handbook begins with the rights, responsibilities and values expected of permanent residents and citizens.",
    bullets: [
      "Fundamental principles include democracy, the rule of law, individual liberty, tolerance of different faiths and beliefs, and participation in community life.",
      "Residents are expected to respect and obey the law, respect the rights of others, treat others fairly, look after themselves and their family, and care for the local area and environment.",
      "The UK offers freedoms including belief and religion, speech, protection from unfair discrimination, fair trial, and participation in elections.",
      "The Life in the UK test has 24 questions and is based on the whole handbook.",
    ],
  },
  {
    id: "uk",
    kicker: "Chapter 2",
    title: "What is the UK?",
    summary:
      "This section explains the countries, phrases and constitutional arrangements that make up the UK.",
    bullets: [
      "The United Kingdom is England, Scotland, Wales and Northern Ireland.",
      "Great Britain means England, Scotland and Wales, not Northern Ireland.",
      "The Channel Islands and the Isle of Man are Crown dependencies: linked to the UK but not part of it.",
      "The UK Parliament sits in Westminster, while Scotland, Wales and Northern Ireland have devolved institutions.",
    ],
  },
  {
    id: "history",
    kicker: "Chapter 3",
    title: "A long and illustrious history",
    summary:
      "The history chapter covers early Britain, invasions, monarchy, Parliament, religious change, empire, world wars and post-war Britain.",
    bullets: [
      "Key dates include the Roman invasion in AD 43, the Norman Conquest in 1066, Magna Carta in 1215, the Black Death in 1348, and the Battle of Bosworth Field in 1485.",
      "Henry VIII broke from Rome and established the Church of England; Elizabeth I's reign included the defeat of the Spanish Armada in 1588.",
      "The Glorious Revolution and Bill of Rights limited the monarch's power and strengthened Parliament.",
      "The Industrial Revolution transformed work, transport and cities; Britain produced major inventions in the 20th century.",
      "The NHS and modern welfare state were created after the Second World War.",
    ],
  },
  {
    id: "society",
    kicker: "Chapter 4",
    title: "A modern, thriving society",
    summary:
      "This chapter covers population, culture, religion, sport, leisure, landmarks and everyday life in the UK.",
    bullets: [
      "Capital cities are London for the UK, Edinburgh for Scotland, Cardiff for Wales and Belfast for Northern Ireland.",
      "The UK uses the pound sterling. Scotland and Northern Ireland have their own banknotes, but shops do not have to accept them.",
      "The Church of England is the established Church in England; the Church of Scotland is Presbyterian; Wales and Northern Ireland have no established Church.",
      "Major cultural topics include the Proms, British literature, theatre, cinema, architecture, festivals and sporting traditions.",
      "Popular landmarks include Big Ben, the Eden Project, Edinburgh Castle, the Giant's Causeway, the London Eye, Snowdonia, the Tower of London and the Lake District.",
    ],
  },
  {
    id: "government",
    kicker: "Chapter 5",
    title: "Government, law and your role",
    summary:
      "This section explains democracy, Parliament, the monarchy, devolved administrations, rights, courts, taxation, driving and community participation.",
    bullets: [
      "The UK is a parliamentary democracy with the monarch as head of state.",
      "The House of Commons is elected by constituencies; the House of Lords checks and revises laws.",
      "The Prime Minister usually leads the party able to command a majority in the House of Commons and lives officially at 10 Downing Street.",
      "The Scottish Parliament sits at Holyrood in Edinburgh, the Welsh Assembly/Senedd is in Cardiff Bay, and the Northern Ireland Assembly meets at Stormont in Belfast.",
      "The law applies equally to everyone and includes criminal law, civil law, police duties, independent courts and human rights protections.",
    ],
  },
  {
    id: "key-facts",
    kicker: "Summary",
    title: "Key material and facts",
    summary:
      "The PDF ends with a condensed list of acts, eras, wars, events and people that are useful for revision.",
    bullets: [
      "Key acts include Magna Carta, Habeas Corpus Act, Bill of Rights, Act of Union, Reform Act and Emancipation Act.",
      "Key eras include Roman Britain, the Middle Ages, the Elizabethan period, the Enlightenment, the Industrial Revolution and the Victorian Age.",
      "Key wars and battles include Hastings, Bannockburn, Bosworth Field, Trafalgar, Waterloo, the Somme, Dunkirk and the Battle of Britain.",
      "Key people include Alfred the Great, Robert Burns, Isambard Kingdom Brunel, Florence Nightingale, Emmeline Pankhurst, Margaret Thatcher, Alexander Fleming and Arthur Conan Doyle.",
    ],
  },
];
