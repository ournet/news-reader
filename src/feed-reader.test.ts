
import test from 'ava';
import { readFeed } from './feed-reader';

test('encoding', async t => {
    const urls = ['https://www.fontanka.ru/fontanka.rss'];
    for (const url of urls) {
        const items = await readFeed(url);
        t.true(items.length > 0);
        t.log(JSON.stringify(items.map(item => item.title)));
    }
})
