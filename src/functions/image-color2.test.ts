import test from "ava";
import { getImageColor } from "./image-color2";
import fetch from "node-fetch";

const DATA: { [key: string]: { color: string; contentType: string } } = {
  "http://news.ournetcdn.net/events/gwf/master/gwFIWGIXyKI-8a3d34-150j.jpg": {
    color: "faf7f1",
    contentType: "image/jpeg"
  },
  "http://news.ournetcdn.net/events/jh1/master/jh19BHDaZ6o-6f6655-150j.jpg": {
    color: "706755",
    contentType: "image/jpeg"
  }
};

Object.keys(DATA).forEach((url) => {
  const image = DATA[url];

  test(url, async (t) => {
    const response = await fetch(url).then((r) => r.buffer());
    t.is(await getImageColor(response, image.contentType), image.color);
  });
});
