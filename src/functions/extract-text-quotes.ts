const quoteParser = require("quote-parser");

export type TextQuote = {
  index: number;
  text: string;
  author: { index: number; id: string };
};

export function extractTextQuotes(
  text: string,
  lang: string,
  persons: { id: string; index: number }[]
): TextQuote[] {
  let quotes: TextQuote[] = [];
  try {
    quotes = quoteParser.parse(text, lang, { persons }) as TextQuote[];
  } catch (_e) {
    console.log(`Quotes not supported for language ${lang}`);
  }
  if (!quotes || !quotes.length) {
    return [];
  }

  return quotes.filter((item) => delete (<any>item).name && !!item.author);
}
