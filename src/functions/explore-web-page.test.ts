
import test from 'ava';
import { exploreWebPage } from './explore-web-page';

test('meta', async t=>{
    const data = await exploreWebPage('http://www.fontanka.ru/2018/08/18/023/?feed', 'ru');
    t.truthy(data);
    t.is(data.url, 'http://fontanka.ru/2018/08/18/023');
    t.is(data.title, 'Pornhub будет платить виртуальной валютой за просмотр порно. «Только не перестарайтесь»');
    t.is(data.description, 'Фонтанка.Ру: Pornhub будет платить виртуальной валютой за просмотр порно. «Только не перестарайтесь»');
    t.truthy(data.text);
})
