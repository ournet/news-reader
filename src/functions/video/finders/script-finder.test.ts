import test from 'ava';
import scriptVideoFinder from './script-finder';
import * as got from 'got';
import * as cheerio from 'cheerio';


test('parse', async t => {
    const response = await got('https://www.cancan.ro/a-facut-piata-cu-un-bentley-de-200-000-e-dar-s-a-zgarcit-la-50-de-bani-pentru-o-sacosa-19926856');
    const $ = cheerio.load(response.body);

    const videos = scriptVideoFinder($);

    t.is(videos.length, 1);
})
