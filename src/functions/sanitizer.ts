
import { sanitizeTitle, sanitizeArticle } from 'news-sanitizer';

export function sanitizeNewsTitle(text: string, lang: string) {
    return sanitizeTitle(text, lang);
}

export function sanitizeNewsText(text: string, lang: string) {
    return sanitizeArticle(text, lang);
}
