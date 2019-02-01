
import test from 'ava';
import iframeVideoFinder from './iframe-finder';
import * as cheerio from 'cheerio';



test('no iframe', t => {
    const $ = cheerio.load(`<html></html>`);

    t.is(iframeVideoFinder($).length, 0);
})

test('iframe without src', t => {
    const $ = cheerio.load(`<html><iframe></iframe></html>`);

    t.is(iframeVideoFinder($).length, 0);
})

test('unknown iframe src', t => {
    const $ = cheerio.load(`<html><iframe src="http://exe.com"></iframe></html>`);

    t.is(iframeVideoFinder($).length, 0);
})

test('youtube iframe', t => {
    const $ = cheerio.load(`<html><iframe src="https://www.youtube.com/embed/hu78H8"></iframe></html>`);

    const videos = iframeVideoFinder($);
    t.is(videos.length, 1);
    t.is(videos[0].url, 'https://www.youtube.com/embed/hu78H8');
})

test('sort videos by iframe width', t => {
    const $ = cheerio.load(`<html>
    <iframe src="https://www.youtube.com/embed/hu78H8" width="100"></iframe>
    <iframe src="https://www.youtube.com/embed/hu78H82" width="102"></iframe>
    </html>`);

    const videos = iframeVideoFinder($);
    t.is(videos.length, 2);
    t.is(videos[0].url, 'https://www.youtube.com/embed/hu78H82');
    t.is(videos[0].width, 102);
    t.is(videos[1].url, 'https://www.youtube.com/embed/hu78H8');
    t.is(videos[1].width, 100);
})
