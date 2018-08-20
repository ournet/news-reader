import iconv = require('iconv-lite');
import { Duplex } from 'stream';
const peek = require('peek-stream');
const splicer = require('stream-splicer');

function convertFrom(encoding: string) {
    return splicer([
        iconv.decodeStream(encoding),
        iconv.encodeStream('utf8')
    ])
}

function getSupportedEncoding(encoding: string) {
    if (encoding === 'ISO-8859-8-I') encoding = 'ISO-8859-8';
    if (iconv.encodingExists(encoding)) return encoding;
    return 'utf8' // default
}

export function toutf8(): Duplex {
    // detect encoding first
    return peek({ maxBuffer: 65535 }, function (data: Buffer, swap: any) {
        if (!Buffer.isBuffer(data)) return swap(new Error('No buffer'));
        const firstline = data.toString('utf8');
        const result = /encoding="(.+)"/.exec(firstline);
        let encoding = 'utf8';
        if (result) {
            encoding = getSupportedEncoding(result[1]);
        }
        swap(null, convertFrom(encoding));
    })
}