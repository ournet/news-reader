
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

test('invalid .swf video', async t => {
    const video = await exploreVideo({
        html: `<html><head><meta property="og:video" content="http://example.com/movie.swf" /></head></html>`,
        url: 'http://url.ur',
    });

    t.is(video, undefined);
})

test('head video', async t => {
    const video = await exploreVideo({
        html: `<html><head><meta property="og:video" content="https://www.5-tv.ru/player/237868"></head></html>`,
        url: 'http://url.ur',
    });

    t.is(!!video, true);
    if (!video) {
        return;
    }
    t.is(video.sourceId, 'https://www.5-tv.ru/player/237868');
    t.is(video.sourceType, 'IFRAME');
})

// test('filter small video', async t => {
//     let video = await exploreVideo({
//         html: `<html><body><iframe src="https://www.5-tv.ru/player/237868" width="300px"></iframe></body></html>`,
//         url: 'http://url.ur',
//     });

//     t.is(video, undefined);
    
//     video = await exploreVideo({
//         html: `<html><body><iframe src="https://www.5-tv.ru/player/237868" width="401"></iframe></body></html>`,
//         url: 'http://url.ur',
//     });

//     t.is(!!video, true);
// })
