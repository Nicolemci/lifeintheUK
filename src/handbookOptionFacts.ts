const handbookOptionFacts: Record<string, string> = {
  "act for the government of wales":
    "The Act for the Government of Wales, passed under Henry VIII, formally united Wales with England and reformed the Welsh legal system.",
  "act of union":
    "The Act of Union 1707 united the kingdoms of England and Scotland and created the Kingdom of Great Britain.",
  "american colonies":
    "In 1776, 13 American colonies declared independence after disputes including taxation without representation.",
  "battle of agincourt":
    "The Battle of Agincourt took place in 1415 during the Hundred Years War, when Henry V's outnumbered English army defeated the French.",
  "battle of bannockburn":
    "At the Battle of Bannockburn in 1314, Robert the Bruce led the Scots to defeat the English.",
  "battle of britain":
    "The Battle of Britain was the 1940 air battle in which the RAF resisted Germany's attempt to control the air before a planned invasion.",
  "battle of bosworth field":
    "The Battle of Bosworth Field in 1485 ended the Wars of the Roses and led to Henry Tudor becoming Henry VII.",
  "battle of hastings":
    "The Battle of Hastings took place in 1066, when William of Normandy defeated Harold and became king of England.",
  "battle of the somme":
    "The Battle of the Somme took place in 1916 during the First World War; British forces suffered about 60,000 casualties on the first day.",
  "battle of trafalgar":
    "At the Battle of Trafalgar in 1805, Admiral Nelson led the British fleet to defeat the combined French and Spanish fleets.",
  "battle of waterloo":
    "The Battle of Waterloo in 1815 ended the French Wars when the Duke of Wellington defeated Napoleon.",
  "bayuex tapestry":
    "The Bayeux Tapestry commemorates the Norman Conquest and the Battle of Hastings.",
  "bayeux tapestry":
    "The Bayeux Tapestry commemorates the Norman Conquest and the Battle of Hastings.",
  "beveridge report":
    "The Beveridge Report of 1942 set out ideas that became the basis of the modern welfare state.",
  "bill of rights":
    "The Bill of Rights 1689 confirmed the rights of Parliament and limits on the monarch's power.",
  "black death":
    "The Black Death reached Britain in 1348 and killed over one third of the population, changing work, wages, towns and social classes.",
  "boer war":
    "The Boer War took place in South Africa from 1899 to 1902 between Britain and Dutch settlers known as Boers.",
  "book of common prayer":
    "The Book of Common Prayer was written during Edward VI's reign for use in the Church of England.",
  "chartists":
    "The Chartists campaigned in the 1830s and 1840s for democratic reforms including wider voting rights, secret ballots and paid MPs.",
  "concorde":
    "Concorde was the supersonic passenger aircraft developed by Britain and France; it first flew in 1969 and carried passengers from 1976.",
  "crown dependencies":
    "The Channel Islands and the Isle of Man are Crown dependencies: linked to the UK but not part of it.",
  "danelaw":
    "The Danelaw was the area in eastern and northern England where many Viking settlers lived.",
  "domesday book":
    "The Domesday Book was the Norman survey listing towns, villages, landholders, residents and animals after the Norman Conquest.",
  "dunkirk":
    "The Dunkirk evacuation in 1940 rescued more than 300,000 British and French soldiers from beaches in France.",
  "easter rising":
    "The Easter Rising was a 1916 uprising against British rule in Dublin after Home Rule was postponed.",
  "education act":
    "The Education Act 1944, also called the Butler Act, introduced free secondary education in England and Wales.",
  "emancipation act":
    "The Emancipation Act 1833 abolished slavery throughout the British Empire.",
  "english civil war":
    "The English Civil War began in 1642 between Parliament's supporters, the Roundheads, and the king's supporters, the Cavaliers.",
  "glorious revolution":
    "The Glorious Revolution of 1688 brought William and Mary to the throne and strengthened Parliament's power over the monarch.",
  "good friday agreement":
    "The Good Friday Agreement was signed in 1998 and helped establish the Northern Ireland Assembly and peace process.",
  "great britain":
    "Great Britain refers to England, Scotland and Wales, but not Northern Ireland.",
  "great depression":
    "The Great Depression began in 1929 and caused serious unemployment in parts of the UK, especially heavy industries.",
  "great fire of london":
    "The Great Fire of London in 1666 destroyed much of the city, including St Paul's Cathedral, which was later rebuilt by Sir Christopher Wren.",
  "great plague":
    "The Great Plague was a major outbreak of plague in London in 1665.",
  "habeas corpus act":
    "The Habeas Corpus Act 1679 guaranteed that no one could be held prisoner unlawfully and that prisoners had a right to a court hearing.",
  "hadrian's wall":
    "Hadrian's Wall was built on the orders of Emperor Hadrian to keep out the Picts in what is now Scotland.",
  "hundred years war":
    "The Hundred Years War was a long medieval conflict with France that actually lasted 116 years.",
  "industrial revolution":
    "The Industrial Revolution was the rapid development of industry in Britain in the 18th and 19th centuries, driven by machinery and steam power.",
  "king james bible":
    "The King James Bible, or Authorised Version, was a new English translation of the Bible produced during King James I's reign.",
  "magna carta":
    "Magna Carta was agreed in 1215 and limited the king's powers while establishing that even the monarch was subject to law.",
  "national health service":
    "The National Health Service was established in 1948 and provides healthcare free at the point of use.",
  "nhs":
    "The National Health Service was established in 1948 and provides healthcare free at the point of use.",
  "northern ireland assembly":
    "The Northern Ireland Assembly was established after the Belfast/Good Friday Agreement and has elected MLAs.",
  "overseas territories":
    "British overseas territories, such as St Helena and the Falkland Islands, are linked to the UK but are not part of it.",
  "reform act":
    "The Reform Act 1832 abolished pocket and rotten boroughs, gave more seats to towns and cities, and increased the number of male voters.",
  "restoration":
    "The Restoration happened in 1660 when Parliament invited Charles II to return as king after the period without a monarch.",
  "scottish parliament":
    "The Scottish Parliament was established in 1999, sits in Edinburgh and can pass laws on devolved matters.",
  "spanish armada":
    "The Spanish Armada was defeated in 1588 during Elizabeth I's reign.",
  "statute of rhuddlan":
    "The Statute of Rhuddlan in 1284 annexed Wales to the Crown of England under Edward I.",
  "suffragettes":
    "The suffragettes campaigned for women's voting rights; women over 30 gained the vote in 1918 and equal voting age followed in 1928.",
  "treaty of union":
    "The Treaty of Union is the Scottish name for the Act of Union 1707, which created the Kingdom of Great Britain.",
  "union flag":
    "The Union Flag, often called the Union Jack, combines crosses associated with England, Scotland and Ireland.",
  "welsh assembly":
    "The Welsh Assembly was created after devolution and is based in Cardiff; it can make laws in devolved areas.",
  "wars of the roses":
    "The Wars of the Roses began in 1455 between the Houses of Lancaster and York and ended at Bosworth Field in 1485.",
};

function normalizeOption(option: string): string {
  return option
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getHandbookOptionFact(option: string): string | undefined {
  return handbookOptionFacts[normalizeOption(option)];
}
