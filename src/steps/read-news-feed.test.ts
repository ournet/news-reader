
import test from 'ava';
import { readNewsFeed } from './read-news-feed';
// import { writeFileSync } from 'fs';

test('sanitize', async t => {
    const feed = { url: 'https://www.fontanka.ru/fontanka.rss', language: 'ru' };
    const source = { id: 'fontanka', country: 'ru', name: '', url: '' };
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 1);

    const items = await readNewsFeed(feed, source, minDate);
    t.true(items.length > 0);
    // writeFileSync('file.json', JSON.stringify(items[0]));
    t.log(JSON.stringify(items[0]));
})
