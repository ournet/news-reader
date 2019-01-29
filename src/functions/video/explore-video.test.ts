
import test from 'ava';
import { exploreVideo } from './explore-video';



test('no head', async t => {
    const video = await exploreVideo({
        html: `<html></html>`,
        url: 'http://url.ur',
    });

    t.is(video, undefined);
})

test('no videos', async t => {
    const video = await exploreVideo({
        html: `<html><head></head></html>`,
        url: 'http://url.ur',
    });

    t.is(video, undefined);
})

test('head video', async t => {
    const video = await exploreVideo({
        html: `<html><head><meta property="og:video" content="http://example.com/movie.swf" /></head></html>`,
        url: 'http://url.ur',
    });

    t.is(!!video, false);
    if (!video) {
        return;
    }
    t.is(video.sourceId, 'http://example.com/movie.swf');
    t.is(video.sourceType, 'IFRAME');
})
