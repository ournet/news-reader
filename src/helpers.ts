
const ellipsize = require('ellipsize');
import striptags = require('striptags');
import entities = require('entities');
const sanitizeHtml = require('sanitize-html');

export function decodeHtml(html: string) {
    return entities.decodeHTML(html);
}

export function extractTextFromHtml(html: string) {
    html = sanitizeHtml(html);
    return striptags(html);
}

export function truncateAt(text: string, maxLength: number): string {
    return ellipsize(text, maxLength, { truncate: false });
}

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
