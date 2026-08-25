# Server runbook

Everything below is run as `root` on the instance, from
`/var/node/ournet/news-reader`.

## 1. Stop the current schedule first

The point of the deploy is to stop runs piling up, so remove the old entries
*before* installing new code - otherwise the old `*/5` schedule keeps launching
processes while you work.

```sh
# comment out every news-reader line in the active cron file
sed -i '/news-reader/ s/^\([^#]\)/#\1/' /etc/cron.d/ournet
systemctl reload cron    # or: service cron reload
```

Then let the in-flight runs finish, or kill them:

```sh
pgrep -af 'news-reader.*app.js'
pkill -f 'news-reader.*lib/app.js'
```

## 2. Check what you are actually running on

The whole design assumes a known memory ceiling, so measure before choosing it:

```sh
nproc                        # vCPUs
free -m                      # total RAM, and how deep into swap you already are
node -v                      # must be >= 16 (AbortController is used for timeouts)
```

Record `MemTotal`. You need it for step 5.

## 3. Deploy

```sh
cd /var/node/ournet/news-reader
git pull
npm install                  # get-image-colors is gone, get-rgba-palette is new
npm run tsc
```

`npm install` matters this time: the image colour path changed dependency.

## 4. Verify one locale by hand before scheduling anything

```sh
./bin/run-locale.sh ro-ro
```

Watch for the final line - `END ro-ro in <n>s`. That number is the input to
step 5. Run it for your slowest locale too (`ro-md`, 74 feeds).

While it runs, in another shell:

```sh
watch -n2 "ps -o rss=,etime=,cmd= -C node | grep app.js"
```

Expect roughly **300MB RSS** and a flat curve. If RSS climbs past ~500MB, stop
and say so - that is not what this build does here.

Sanity check the guards actually engage:

```sh
./bin/run-locale.sh ro-ro &          # leave one running
./bin/run-locale.sh ro-ro            # must print SKIP and exit 0 immediately
```

## 5. Choose the two numbers

| `MemTotal` | `MAX_CONCURRENT_RUNS` | `NODE_HEAP_MB` |
| --- | --- | --- |
| 1 GB (t3.micro) | `1` | `256` |
| 2 GB (t3.small) | `2` | `320` |
| 4 GB (t3.medium) | `4` | `384` |
| 8 GB + | `6` | `512` |

Rule of thumb: `MAX_CONCURRENT_RUNS × 350MB + 250MB` for the OS and whatever
else is on the box (you also run horoscope-generator, weather-notifier,
actors-generator and name-explorer from the same cron file - check their
schedules do not collide with the news-reader minutes).

`MAX_RUN_SECONDS` should stay comfortably below the cron interval. With the
15-minute schedule, `600` leaves 5 minutes of headroom.

On a 2GB instance both defaults are already correct and there is nothing to
set - every knob has a working default in code. To change one, edit the
`${VAR:-default}` line in `bin/run-locale.sh`; an outer value always wins.

`MAX_CONCURRENT_RUNS` can also go in `.env` (it is read by the app). `NODE_HEAP_MB`
cannot - it becomes a `node` command-line flag, so it only works from the shell.

**CPU matters as much as RAM.** On 2 vCPUs do not go above
`MAX_CONCURRENT_RUNS=2` regardless of free memory: image decoding is CPU bound,
and a saturated CPU makes the box feel just as stuck as a saturated RAM.

## 6. Install the schedule

```sh
npm run setup-crontab        # cp ./crontab /etc/cron.d/ournet
chmod 644 /etc/cron.d/ournet # cron ignores group/other-writable files
systemctl reload cron
```

Check the file is accepted:

```sh
grep news-reader /etc/cron.d/ournet
journalctl -u cron --since '-5min' | grep -i news-reader
```

Cron runs these with `PATH=/sbin:/bin:/usr/sbin:/usr/bin`. If `node` is not on
that path (nvm installs are not), set `NODE_BIN` in `bin/run-locale.sh` to the
absolute path from `command -v node`.

## 7. Add the safety nets you do not have yet

None of these are in the repo - they are instance configuration.

**Swap.** If the box has none, an over-commit becomes an instant freeze instead
of a slow one. 2GB of swap turns a hang into something you can still SSH into:

```sh
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' >> /etc/sysctl.d/99-swap.conf
```

**A CloudWatch alarm on memory.** The default EC2 metrics do *not* include
memory, which is why this failure was invisible. Install the CloudWatch agent
with `mem_used_percent` and alarm at 85%.

**Log rotation.** The cron lines write to `/var/log/news-reader-*.log` and
nothing truncates them:

```sh
cat > /etc/logrotate.d/news-reader <<'ROT'
/var/log/news-reader-*.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
  copytruncate
}
ROT
```

## 8. What to watch for the first day

```sh
# how long each locale actually takes
grep -h '^END' /var/log/news-reader-*.log | tail -50

# how often a tick is skipped - a few is healthy, constant skipping means
# MAX_RUN_SECONDS or MAX_CONCURRENT_RUNS is too tight for the feed volume
grep -hc 'SKIP' /var/log/news-reader-*.log

# runs that hit the deadline instead of finishing their feeds
grep -h 'Deadline reached' /var/log/news-reader-*.log | tail

# the hard kill should never appear; if it does, something hangs below the
# per-item timeout and is worth reporting
grep -h 'TIMEOUT' /var/log/news-reader-*.log
```

Steady state to expect: `END` well under 600s, occasional `SKIP`, no `TIMEOUT`,
`free -m` showing no swap growth across a day.

If a locale is *always* hitting the deadline, it has more feeds than a 15-minute
slot can carry - give that locale its own tighter schedule rather than raising
`MAX_RUN_SECONDS` past the interval.

## 9. Rolling back

```sh
cd /var/node/ournet/news-reader && git checkout <previous-sha> && npm install && npm run tsc
```

Stale locks do not survive a reboot or a killed process (the pid is checked and
an abandoned lock is reclaimed), but if you ever need to clear them by hand:

```sh
rm -f /var/node/ournet/news-reader/data/locks/*
```
