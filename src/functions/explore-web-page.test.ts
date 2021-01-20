import test from "ava";
import { exploreWebPage } from "./explore-web-page";

test("meta", async (t) => {
  const data = await exploreWebPage(
    "http://www.fontanka.ru/2018/08/18/023/?feed",
    "ru"
  );
  t.truthy(data);
  t.is(data.url, "http://fontanka.ru/2018/08/18/023");
  t.is(
    data.title,
    "Pornhub будет платить виртуальной валютой за просмотр порно. «Только не перестарайтесь»"
  );
  t.is(
    data.description,
    "Дочерняя компания порнографического сайта Pornhub, сервис Tube8, намерена ввести вознаграждения за просмотр порнофильмов."
  );
  t.truthy(data.text);
});

test("invalid image", async (t) => {
  const page = await exploreWebPage(
    "https://www.championat.com/football/news-3677867-otkryt-nabor-komand-na-sportivno-futbolnuju-viktorinu-chempionata.html",
    "ru"
  );
  t.is(page.images.length, 0);
});
