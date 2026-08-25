/**
 * Process-wide resource limits.
 *
 * MUST be imported before any other module that touches sharp/libvips.
 *
 * Rationale: this app runs as N concurrent cron processes (one per locale) on a
 * single small box. Every process loads sharp, aws-sdk, metascraper & cheerio,
 * which alone costs ~150MB RSS. Left at their defaults, libvips spawns one
 * worker thread per CPU *per process* and keeps a pixel cache, so a handful of
 * overlapping runs saturate both CPU and RAM and the box stops responding.
 */
import sharp from "sharp";
import { LIMITS } from "./config";

// libvips keeps decoded pixel data in a process-local cache. We touch every
// image exactly once, so the cache is pure memory overhead.
sharp.cache(false);

// Default is os.cpus().length *per process*. With several locales running at
// once that oversubscribes the CPU many times over.
sharp.concurrency(LIMITS.SHARP_CONCURRENCY);
