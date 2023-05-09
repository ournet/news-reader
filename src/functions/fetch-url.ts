import fetch, { Headers } from "node-fetch";
import iconv = require("iconv-lite");
import { Dictionary } from "@ournet/domain";
import { URL } from "url";

const charset = require("charset");

export async function fetchUrl(
  webUrl: string,
  options?: { headers?: Dictionary<string>; timeout?: number }
) {
  let headers: Headers;
  let buffer: Buffer;
  let url: string;

  try {
    const data = await fetch(new URL(webUrl), {
      ...options
    });
    headers = data.headers;
    buffer = await data.buffer();
    url = data.url;
  } catch (e: any) {
    throw new Error(e.message || "Error GET " + webUrl);
  }
  const encoding = detectEncoding(
    headers.get("content-type") as string,
    buffer
  );

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
