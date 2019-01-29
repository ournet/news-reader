import test from 'ava';
import { parseHtmlSize, getKnownVideoSource } from './utils';

test('getKnownVideoSource', t => {
    t.deepEqual(getKnownVideoSource('http://ava.com'), {});
    t.deepEqual(getKnownVideoSource('https://www.youtube.com/watch?v=MLmy2dxD0KM&list=RDFw3eMp8m-XQ&index=27'),
        { sourceId: 'MLmy2dxD0KM', sourceType: 'YOUTUBE' });
})

test('parseHtmlSize', t => {
    t.is(parseHtmlSize(''), undefined)
    t.is(parseHtmlSize(' px'), undefined)
    t.is(parseHtmlSize('10px'), 10)
    t.is(parseHtmlSize('10'), 10)
    t.is(parseHtmlSize('100%'), undefined)
})
