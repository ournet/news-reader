
import test from 'ava';
import { exploreWebPage } from './explore-web-page';

test('meta', async t=>{
    const data = await exploreWebPage('http://www.fontanka.ru/2018/08/18/023/?feed');
    t.truthy(data);
    t.is(data.url, 'http://fontanka.ru/2018/08/18/023');
    t.is(data.title, 'Pornhub будет платить виртуальной валютой за просмотр порно. «Только не перестарайтесь»');
    t.is(data.description, 'Дочерняя компания порнографического сайта Pornhub, сервис Tube8, намерена ввести вознаграждения за просмотр порнофильмов.За «работу» будут платить криптовалютой.Об этом сообщает TNW со ссылкой на заявление представителя сервиса Робина Тернера 18 августа.');
    t.truthy(data.text);
})
