
import { sanitizeTitle, sanitizeArticle } from 'news-sanitizer';
import { standardText } from '../helpers';

export function sanitizeNewsTitle(text: string, lang: string) {
    text = standardText(text, lang);
    return sanitizeTitle(text, lang);
}

export function sanitizeNewsText(text: string, lang: string) {
    text = standardText(text, lang);
    return sanitizeArticle(text, lang);
}
