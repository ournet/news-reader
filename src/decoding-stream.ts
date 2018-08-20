import { Transform, TransformCallback } from "stream";
import iconv = require('iconv-lite');

export class DecodingStream extends Transform {
    private decEncoding: string = 'utf8';

    public setDecEncoding(encoding: string) {
        if (!encoding) {
            return;
        }
        encoding = encoding.toLowerCase();
        switch (encoding) {
            case 'windows-1251':
            case 'windows1251':
                encoding = 'win1251';
                break;
        }

        this.decEncoding = encoding.toLowerCase();
    }

    _transform(chunk: Buffer, encoding: string, done: TransformCallback) {
        if (!this.decEncoding || this.decEncoding === 'utf8') {
            this.push(chunk, encoding);
        } else {
            var str = iconv.decode(chunk, this.decEncoding);
            this.push(str);
        }

        done();
    }
}
