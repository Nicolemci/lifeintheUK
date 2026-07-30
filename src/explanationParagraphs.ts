/** Split a question explanation into display paragraphs. */
export function explanationParagraphs(explanation: string): string[] {
  return explanation
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
