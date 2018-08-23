
import got = require('got');
import iconv = require('iconv-lite');
import { Dictionary } from '@ournet/domain';
const charset = require('charset');

export async function fetchUrl(webUrl: string, options?: { headers?: Dictionary<string>, timeout?: number }) {
    const { body: buffer, url, headers } = await got(webUrl, { ...options, encoding: null });
    const encoding = detectEncoding(headers['content-type'] as string, buffer);

    if (encoding) {
        if (encoding !== 'utf8') {
            return {
                body: iconv.decode(buffer, encoding),
                url,
            }
        }
    }

    return {
        body: buffer.toString('utf8'),
        url,
    }
}

function detectEncoding(contentType: string, body: Buffer) {
    let encoding = charset(contentType);

    if (!encoding) {
        const head = body.slice(0, 1024).toString('utf8');
        const match = /(?:encoding|charset)="([\S]+)"/.exec(head);
        if (match) {
            encoding = match[1];
            if (iconv.encodingExists(encoding)) {
                return encoding;
            }
            encoding = charset(match[1]);
        }
    }

    return encoding;
}
