import { parse } from "quote-parser";

export type TextQuote = {
  index: number;
  text: string;
  author: { index: number; id: string };
};

export function extractTextQuotes(
  text: string,
  lang: string,
  persons: { id: string; index: number }[],
): TextQuote[] {
  let quotes: TextQuote[] = [];
  try {
    quotes = parse(text, lang, { persons }) as TextQuote[];
  } catch (e) {
    console.log(`Quotes error for language ${lang}`, (e as any)?.message || e);
  }
  if (!quotes || !quotes.length) {
    return [];
  }

  return quotes.filter((item) => delete (<any>item).name && !!item.author);
}
