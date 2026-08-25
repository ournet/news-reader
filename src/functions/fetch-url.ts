import iconv = require("iconv-lite");
import { Dictionary } from "@ournet/domain";
import { download } from "./http";
import { LIMITS } from "../config";

const charset = require("charset");

export async function fetchUrl(
  webUrl: string,
  options?: {
    headers?: Dictionary<string>;
    timeout?: number;
    totalTimeout?: number;
    maxBytes?: number;
  }
) {
  const { buffer, url, contentType } = await download(webUrl, {
    ...options,
    maxBytes: (options && options.maxBytes) || LIMITS.MAX_PAGE_BYTES
  });

  const encoding = detectEncoding(contentType as string, buffer);

  if (encoding) {
    if (encoding !== "utf8") {
      return {
        body: iconv.decode(buffer, encoding),
        url
      };
    }
  }

  return {
    body: buffer.toString("utf8"),
    url
  };
}

function detectEncoding(contentType: string, body: Buffer) {
  let encoding = charset(contentType);

  if (!encoding) {
    const head = body.slice(0, 1024).toString("utf8");
    const match = /(?:encoding|charset)="([\S]+)"/.exec(head);
    if (match) {
      encoding = match[1];
      if (iconv.encodingExists(encoding)) {
        return encoding;
      }
      encoding = charset(match[1]);
    }
  }

  return encoding;
}
