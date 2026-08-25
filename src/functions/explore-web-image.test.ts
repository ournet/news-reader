import test from "ava";
import { exploreWebImage } from "./explore-web-image";

// The hash and colour are whatever the linked libvips produces; both shift by a
// bit or two across sharp upgrades. Treat a mismatch as "check the upgrade",
// not as a broken pipeline.
test("exploreWebImage", async (t) => {
  const image = await exploreWebImage(
    "https://farm2.staticflickr.com/1748/42611032131_11f388793c_q.jpg"
  );
  t.truthy(image);
  // smaller than the master size, so it is stored as downloaded
  t.is(image.width, 150);
  t.is(image.height, 150);
  t.is(image.length, 10774);
  t.is(image.hash, "906c4656e6ee4c9d");
  t.is(image.format, "jpg");
  t.is(image.color, "16210d");
});
