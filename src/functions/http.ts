import axios, { AxiosRequestConfig } from "axios";
import { Dictionary } from "@ournet/domain";
import { LIMITS } from "../config";

/**
 * Bounded HTTP downloads.
 *
 * Two properties matter here and neither is axios' default:
 *
 * 1. `timeout` in the node adapter is `req.setTimeout`, i.e. an *inactivity*
 *    timeout. A server that dribbles one byte every second keeps the request
 *    alive forever, which is exactly how a crawler over a few hundred arbitrary
 *    news sites ends up with runs that never finish. `signal` gives us a real
 *    total-duration cap.
 * 2. `maxContentLength` defaults to -1 (unlimited). With `responseType:
 *    "arraybuffer"` that means any host can push an unbounded body straight
 *    into this process' memory.
 */

/**
 * `AbortController` is a Node >= 15 global, but the pinned @types/node (10.x)
 * predates it, hence the local shape.
 */
type AbortControllerLike = {
  signal: { aborted: boolean };
  abort(): void;
};

const AbortControllerCtor: { new (): AbortControllerLike } = (global as any)
  .AbortController;

export type DownloadOptions = {
  headers?: Dictionary<string>;
  /** Inactivity timeout, passed through to axios. */
  timeout?: number;
  /** Total time the request may take, connect to last byte. */
  totalTimeout?: number;
  maxBytes?: number;
};

export type DownloadResult = {
  buffer: Buffer;
  url: string;
  contentType?: string;
};

export async function download(
  webUrl: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const socketTimeout = options.timeout || LIMITS.HTTP_TIMEOUT_MS;
  const totalTimeout = Math.max(
    options.totalTimeout || LIMITS.HTTP_TIMEOUT_MS,
    socketTimeout
  );
  const maxBytes = options.maxBytes || LIMITS.MAX_PAGE_BYTES;

  if (!AbortControllerCtor) {
    throw new Error("AbortController is not available, Node >= 15 is required");
  }

  const controller = new AbortControllerCtor();
  const abortTimer = setTimeout(
    () => controller.abort(),
    totalTimeout
  ) as any as NodeJS.Timeout;

  const request: AxiosRequestConfig = {
    headers: options.headers,
    timeout: socketTimeout,
    signal: controller.signal as any,
    responseType: "arraybuffer",
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    maxRedirects: 5,
    // a 4xx/5xx must not throw before we can read the body length
    validateStatus: (status) => status >= 200 && status < 300
  };

  try {
    const response = await axios(webUrl, request);
    const headers: any = response.headers;

    return {
      buffer: Buffer.from(response.data),
      url: response.config.url || webUrl,
      contentType:
        (headers && typeof headers.get === "function"
          ? (headers.get("content-type") as string)
          : headers && headers["content-type"]) || undefined
    };
  } catch (e: any) {
    if (controller.signal.aborted) {
      throw new Error(`timeout of ${totalTimeout}ms exceeded GET ${webUrl}`);
    }
    throw new Error(e.message || "Error GET " + webUrl);
  } finally {
    clearTimeout(abortTimer);
  }
}
