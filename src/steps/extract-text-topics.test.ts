
require('dotenv').config();

process.env.ENTITIZER_URL = 'http://free.entitizer.com/v0/extract';
process.env.ENTITIZER_KEY = 'KEY';

import test from 'ava';
import { extractTextTopics } from './extract-text-topics';
import { Locale } from '../types';

test('invalid input', async t => {
    const locale: Locale = {
        lang: 'ro',
        country: 'ro',
    };
    await t.throws(extractTextTopics(locale, ''), /Bad Request/);
})

test('order', async t => {
    const locale: Locale = {
        lang: 'ro',
        country: 'ro',
    };
    const topics = await extractTextTopics(locale, `Președintele Statelor Unite, Donald Trump, a sugerat, luni, că viitoarea sa întâlnire cu liderul regimului de la Phenian, Kim Jong-un, ar putea avea loc în "Casa Păcii", situată la granița dintre Coreea de Nord și Coreea de Sud, relatează site-ul agenției Yonhap`);
    t.truthy(topics);
    t.is(topics.length, 6);
    t.is(topics[0].topic.name, 'Statele Unite ale Americii');
    t.is(topics[1].topic.name, 'Donald Trump');
    t.is(topics[2].topic.name, 'Phenian');
    t.is(topics[3].topic.name, 'Kim Jong-un');
    t.is(topics[4].topic.name, 'Coreea de Nord');
    t.is(topics[5].topic.name, 'Coreea de Sud');
})
