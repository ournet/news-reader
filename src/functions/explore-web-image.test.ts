
import test from 'ava';
import { exploreWebImage } from './explore-web-image';

test('exploreWebImage', async t => {
    const image = await exploreWebImage('https://farm2.staticflickr.com/1748/42611032131_11f388793c_q.jpg');
    t.truthy(image);
    t.is(image.width, 150);
    t.is(image.height, 150);
    t.is(image.hash, '00fe3703007ff604');
    t.is(image.format, 'jpg');
})
