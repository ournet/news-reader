import { HtmlExploredVideoInfo } from "../types";

export default function headVideoFinder(
  $: CheerioStatic
): HtmlExploredVideoInfo[] {
  const $head = $("head");
  const list: HtmlExploredVideoInfo[] = [];
  const width =
    parseInt(
      $head.find('meta[property="og:video:width"]').first().attr("content")
    ) || undefined;
  const height =
    parseInt(
      $head.find('meta[property="og:video:height"]').first().attr("content")
    ) || undefined;

  list.push({
    url: $head
      .find('meta[property="og:video:secure_url"]')
      .first()
      .attr("content"),
    width,
    height
  });
  list.push({
    url: $head.find('meta[property="og:video"]').first().attr("content"),
    width,
    height
  });

  list.push({
    url: $head
      .find('meta[property="twitter:player:stream"]')
      .first()
      .attr("content")
  });

  return list.filter((item) => item.url && item.url.trim().length > 2);
}
