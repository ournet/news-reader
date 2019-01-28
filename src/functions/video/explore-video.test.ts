
import test from 'ava';
import { exploreVideo } from './explore-video';



test('no head', t => {
    const videos = exploreVideo({
        html: `<html></html>`,
        url: 'http://url.ur',
    });

    t.is(videos.length, 0);
})

test('no videos', t => {
    const videos = exploreVideo({
        html: `<html><head></head></html>`,
        url: 'http://url.ur',
    });

    t.is(videos.length, 0);
})

test('head video', t => {
    const videos = exploreVideo({
        html: `<html><head><meta property="og:video" content="http://example.com/movie.swf" /></head></html>`,
        url: 'http://url.ur',
    });

    t.is(videos.length, 1);
    t.is(videos[0].sourceId, 'http://example.com/movie.swf');
    t.is(videos[0].sourceType, 'IFRAME');
})
