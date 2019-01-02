
const ellipsize = require('ellipsize');
import striptags = require('striptags');
import entities = require('entities');
import { Locale } from './types';
const sanitizeHtml = require('sanitize-html');
const inTextSearchFn = require('in-text-search');
const standardTextFn = require('standard-text');

export function standardText(text: string, lang: string): string {
    return standardTextFn(text, lang);
}

export function inTextSearch(q: string): (text: string) => number {
    const textSearch = inTextSearchFn(q);
    return text => textSearch.search(text);
}

export function decodeHtml(html: string) {
    if (html) {
        return entities.decodeHTML(html);
    }
    return html;
}

export function extractTextFromHtml(html: string) {
    html = html.replace(/\n+/g, ' ');
    html = sanitizeHtml(html);
    html = html.replace(/<\/(div|p|section)>/ig, '</$1>\n').trim();
    html = html.replace(/<br>|<br[ ]*\/>/ig, '\n').trim();
    html = striptags(html);
    html = decodeHtml(html);
    html = removeExtraSpaces(html);
    return html.trim();
}

export function truncateAt(text: string, maxLength: number): string {
    return ellipsize(text, maxLength, { truncate: false });
}

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function parseLocale(text: string): Locale | undefined {
    const result = /^([a-z]{2})-([a-z]{2})$/.exec(text);
    if (result) {
        return {
            lang: result[1],
            country: result[2],
        };
    }
}

export function isValidDate(d: Date) {
    return d instanceof Date && !isNaN(d.getTime());
}

export function isLetter(char: string) {
    return char.toLowerCase() !== char.toUpperCase();
}

export function removeExtraSpaces(text: string) {
    if (text) {
        text = text.replace(/\s*\n\s*/g, '\n')
            .replace(/\s*\t\s*/g, '\t')
            .replace(/[\r]+/g, ' ')
            .replace(/ {2,}/g, ' ')
            .trim();
    }
    return text;
}
