
import test from 'ava';
import videoHeadFinder from './head-finder';
import * as cheerio from 'cheerio';

test('no head', t => {
    const $ = cheerio.load(`<html></html>`);

    const videos = videoHeadFinder($);

    t.is(videos.length, 0);
})

test('no video', t => {
    const $ = cheerio.load(`<html><head></head></html>`);

    const videos = videoHeadFinder($);

    t.is(videos.length, 0);
})

test('one video', t => {
    const $ = cheerio.load(`<html><head><meta property="og:video" content="http://example.com/movie.swf" /></head></html>`);

    const videos = videoHeadFinder($);

    t.is(videos.length, 1);
    t.is(videos[0].url, 'http://example.com/movie.swf');
})