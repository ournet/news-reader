# @ournet/news-reader

Ournet news reader app.

One process reads the feeds of one locale, top to bottom, then exits. Cron
starts one such process per locale.

## Running

```sh
LOCALE=ro-ro npm start                 # bare
./bin/run-locale.sh ro-ro              # with the production resource limits
```

`bin/run-locale.sh` is what cron calls. It sets the limits below, takes a
per-locale `flock`, and execs `node ./lib/app.js`.

Install the schedule with `npm run setup-crontab`. See [DEPLOY.md](DEPLOY.md)
for the server side: sizing, verification and what to watch after a deploy.

## Why the limits exist

A run costs roughly **340MB RSS** at the default `FEED_ITEM_CONCURRENCY=3`
(265MB with no concurrency, 336MB at 5) and is mostly network I/O over 36-74
feeds, so it can easily take longer than its cron interval. Left alone,
cron then starts a *second* process for the same locale, and a third, and with
several locales on one instance the box runs out of memory and stops responding.

Three independent mechanisms prevent that:

| Mechanism | Where | What it does |
| --- | --- | --- |
| `flock -n` | `bin/run-locale.sh` | A tick whose previous run is still going exits immediately. |
| Run slot | `src/run-guard.ts` | Same guarantee inside the app, plus a global cap across locales (`MAX_CONCURRENT_RUNS`). Stale locks from crashed runs are reclaimed. |
| Deadline | `src/deadline.ts` | At `MAX_RUN_SECONDS` the run stops between feeds and exits; the remaining feeds are picked up next tick. A hard `process.exit` follows 30s later. |

A run that cannot get through every feed in its slot resumes from where it
stopped rather than from the top (`src/functions/feeds-cursor.ts`). Without
that, a locale with 36 feeds and time for 15 would read the same first 15
forever and never reach the rest.

Every outgoing request is bounded in both **time** and **size**
(`src/functions/http.ts`). Axios' own `timeout` is a socket *inactivity*
timeout, so a slow-dripping server can hold a request open indefinitely -
`totalTimeout` is the real cap. `maxContentLength` defaults to unlimited, which
would let any host stream an unbounded body into memory.

## Environment

Required: `MONGO_DB_CONNECTION`, `NEWS_ES_HOST`, `NEWS_SEARCH_MIN_SCORE`,
`MIN_EVENT_NEWS`, `ENTITIZER_URL`, `ENTITIZER_KEY`, `AWS_*`.

Operational knobs. All optional, all defined in one place - `LIMITS` in
`src/config.ts` - and all read from the environment at startup:

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAX_RUN_SECONDS` | `600` | Soft deadline for a run. Keep below the cron interval. |
| `MAX_CONCURRENT_RUNS` | `2` | Max news-reader processes at once, all locales. |
| `ITEM_TIMEOUT_MS` | `90000` | Budget for a single article. |
| `HTTP_TIMEOUT_MS` | `10000` | Default total timeout per request. |
| `MAX_PAGE_BYTES` | `3145728` | Cap on a downloaded page or feed. |
| `MAX_IMAGE_BYTES` | `8388608` | Cap on a downloaded image. |
| `SHARP_CONCURRENCY` | `1` | libvips worker threads. Its own default is one per CPU, *per process*. |
| `FEED_ITEM_CONCURRENCY` | `3` | Articles fetched at once within a feed. Useful range 1-5; past 5 the sites throttle and it gets slower. Costs ~38MB RSS over sequential. |

A non-numeric or non-positive value throws at startup rather than silently
falling back to the default.

`Config` (`getConfigFromEnv`) stays what it was: the credentials and thresholds
the app cannot start without, validated as required.

These three are **not** app settings and will do nothing in `.env` - they have to
come from the shell, which is what `bin/run-locale.sh` is for:

| Variable | Default | Meaning |
| --- | --- | --- |
| `MALLOC_ARENA_MAX` | `2` | glibc arenas. Unbounded arenas inflate RSS badly with threaded native code. |
| `UV_THREADPOOL_SIZE` | `2` | libuv pool size. |
| `NODE_HEAP_MB` | `320` | Becomes `--max-old-space-size`. Without it V8 grows to ~25% of system RAM before collecting seriously. |

## Sizing

`MAX_CONCURRENT_RUNS` × ~340MB is the memory floor, plus ~200MB for the OS and
whatever else shares the box. Raise the cap only if there is RAM to spare.

Image work is *not* what limits this. sharp runs on the libuv threadpool, so it
never blocks the event loop: measured event loop lag stays at 2-3ms whatever the
concurrency, and HTTP and DNS are unaffected. What image work costs is memory,
and `UV_THREADPOOL_SIZE` is the lever that caps it - it bounds how many sharp
operations are in flight no matter how many articles are being fetched at once.
Measured over 24 images of mixed size:

| | time | peak RSS |
| --- | --- | --- |
| `UV=2` `FEED_ITEM_CONCURRENCY=1` | 1.3s | 265MB |
| `UV=2` `FEED_ITEM_CONCURRENCY=3` | 0.7s | 303MB |
| `UV=2` `FEED_ITEM_CONCURRENCY=5` | 0.7s | 336MB |
| `UV=4` `FEED_ITEM_CONCURRENCY=3` | 0.5s | 332MB |

So raising `UV_THREADPOOL_SIZE` buys a little wall clock for a lot of RSS. If
memory is tight, lower `FEED_ITEM_CONCURRENCY` before touching the threadpool.
