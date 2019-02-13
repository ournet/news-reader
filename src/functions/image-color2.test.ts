
import test from 'ava';
import got = require('got');
import { getImageColor } from './image-color2';

const DATA: { [key: string]: { color: string, contentType: string } } = {
    'http://news.ournetcdn.net/events/gwf/master/gwFIWGIXyKI-8a3d34-150j.jpg': {
        color: 'faf7f1',
        contentType: 'image/jpeg'
    },
    'http://news.ournetcdn.net/events/jh1/master/jh19BHDaZ6o-6f6655-150j.jpg': {
        color: '706755',
        contentType: 'image/jpeg'
    },
}

Object.keys(DATA).forEach(url => {
    const image = DATA[url];

    test(url, async t => {
        const response = await got(url, { encoding: null });
        t.is(await getImageColor(response.body, image.contentType), image.color);
    })
})
