import test from "ava";
import scriptVideoFinder from "./script-finder";
import axios from "axios";
import * as cheerio from "cheerio";

test("parse", async (t) => {
  const response = await axios(
    "https://www.cancan.ro/a-facut-piata-cu-un-bentley-de-200-000-e-dar-s-a-zgarcit-la-50-de-bani-pentru-o-sacosa-19926856"
  );
  const $ = cheerio.load(response.data);

  const videos = scriptVideoFinder($);

  t.is(videos.length, 1);
});

test("parse 2", async (t) => {
  const response = await axios(
    "https://www.libertatea.ro/sport/sferturile-de-finala-ale-cupei-cev-la-volei-feminin-victorie-pentru-stiinta-bacau-prima-mansa-2537396"
  );
  const $ = cheerio.load(response.data);

  const videos = scriptVideoFinder($);

  t.is(videos.length, 0);
});
