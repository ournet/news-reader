
import got = require('got');
import iconv = require('iconv-lite');
const charset = require('charset');

export async function fetchUrl(webUrl: string) {
    const { body: buffer, url, headers } = await got(webUrl, { encoding: null });
    let encoding = charset(headers['content-type']);

    if (encoding && encoding !== 'utf8') {
        return {
            body: iconv.decode(buffer, encoding),
            url,
        };
    }

    return {
        body: buffer.toString('utf8'),
        url,
    }
}