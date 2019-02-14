
import test from 'ava';
import { isValidImageUrl } from './invalid-images';

const INVALID = [
    'https://img.championat.com/news2/social/9/89/3677867.jpg',
    'https://championat.com/news2/social/9/89/3677867.jpg',
    'https://static.novayagazeta.ru/storage/news_entry/149209/picture-b4ee594ca58c4f0091d681cf87def57c.png',
    'https://s3.zona.media/e9f94b3eacd600312caab885a451545a.jpg',
]

const VALID = [
    'https://achampionat.com/news2/social/9/89/3677867.jpg',
]

test('invalid list', t => {
    INVALID.forEach(url => t.false(isValidImageUrl(url)));
})

test('valid list', t => {
    VALID.forEach(url => t.true(isValidImageUrl(url)));
})
