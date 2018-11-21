
import { sanitizeTitle, sanitizeArticle } from 'news-sanitizer';
import { standardText, removeExtraSpaces } from '../helpers';

export function sanitizeNewsTitle(text: string, lang: string) {
    text = standardText(text, lang);
    text = removeExtraSpaces(text);
    return sanitizeTitle(text, lang);
}

export function sanitizeNewsText(text: string, lang: string) {
    text = standardText(text, lang);
    text = removeExtraSpaces(text);
    return sanitizeArticle(text, lang);
}
