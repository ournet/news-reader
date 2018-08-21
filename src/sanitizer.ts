
import striptags = require('striptags');
import entities = require('entities');

export function sanitizeNewsTitle(text: string) {
    if (!text) {
        return text;
    }
    text = striptags(text);

    text = entities.decodeHTML(text);

    return text;
}

export function sanitizeNewsText(text: string) {
    if (!text) {
        return text;
    }
    text = striptags(text);

    text = entities.decodeHTML(text);

    return text;
}
