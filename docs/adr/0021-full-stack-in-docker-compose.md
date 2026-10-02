# 0021, the full stack in Docker Compose, and images built in CI

Status: accepted · 2026-10-02

## Context

Phase 7 asks for the whole stack to start with one command and for every push
to run the tests and build images. Until now compose started only PostgreSQL,
Kafka and Redis, and the API, the simulator, the detector and the Vite dev
server each ran on the host from its own terminal.

Running them in containers raises questions the host setup never did:

- The frontend calls the API on its own origin under `/api` (ADR 0009), and
  the alert socket accepts a handshake only from a page on the API's own
  origin, which Spring judges by comparing the browser's `Origin` with the
  request's scheme, host and port (ADR 0016). In development, Vite's proxy
  makes both true.
- The sign-in rate limit counts requests per client address (ADR 0011). Behind
  any proxy, every visitor arrives from the proxy's address, so ten failed
  sign-ins by anyone would lock out everyone for a minute.
- Detection needs 63 days of history. The host instructions backfill it by
  hand once; a stack that is started, stopped and started again must neither
  skip it on a fresh database nor post a second copy onto a full one. The
  application shares the `sentinel` compose project, and so the database
  volume, with the development setup, which may already hold a backfill.
- The detector's `watch` checks at once and then hourly; started before the
  history is in, its first check finds too little and the first alerts wait
  for the next hour.

## Decision

- **One compose file, the application behind a profile.** The API, a web
  container, the simulator and the detector are services in
  `infra/docker-compose.yml` with `profiles: [app]`. The development command,
  without the profile, starts the three backing services exactly as before;
  `--profile app up -d --build` starts everything. `down` needs the profile
  too, or it leaves the application running. Each container reaches the
  others by service name; settings come from the same `.env`, with the
  in-network addresses set in the compose file in place of its `localhost`
  ones. Kafka gains a second listener, `kafka:19092`, for other containers;
  the host's stays on the published port.
- **nginx is the one origin.** The `web` image is the frontend's production
  build served by nginx, which passes `/api` to the API and upgrades
  `/api/ws`. It is the only service that publishes a port, on loopback, so
  the browser sees one origin as it does through Vite. It passes the
  browser's `Host`, port included, on unchanged, so the socket's same-origin
  check passes for the site's own pages and still refuses others. It looks the
  API's address up per request, so a recreated API container is found again.
- **The visitor's address from a private-network proxy only.** The API runs
  with `server.forward-headers-strategy=native`: Tomcat replaces the remote
  address with the one in `X-Forwarded-For`, but only when the request came
  from a private or loopback address, as nginx's does. nginx appends the
  address it sees, and passes `X-Forwarded-Proto` and `X-Forwarded-Port` on
  only when a proxy in front of it sent them, never from its own scheme, so a
  TLS proxy in front of a deployed demo is reflected and nothing is invented
  without one. The rate limiter itself still never reads the header. The
  setting is in the compose file, not `application.yml`, because only there
  is the API known to be behind this proxy.
- **The history, once.** A one-shot `simulator-backfill` service runs
  `backfill --days 63 --if-empty`: the simulator asks the public trends
  endpoint how many reports the API holds from the last nine weeks, and skips
  the backfill if any. Asking the API, not a marker file, is right even when
  the database already holds a development backfill or a volume was deleted on
  its own. It is never restarted, because a backfill stopped part way would
  then skip and leave part of the history; a failure stops the stack's start
  instead. The live `simulator` and the `detector` both wait for it to
  complete, so the detector's first check, made as it starts, finds the
  history and raises the demo's alerts within minutes of a first start.
- **Images built from the repository root,** one Dockerfile each in
  `infra/docker/`, each with its own `.dockerignore` listing the few paths it
  is built from, so `.env`, build output and `node_modules` never enter a
  build. The API is built with its Maven wrapper and run as a non-root user on
  a JRE; tests are not run in the image build, because they need Docker for
  Testcontainers, and CI runs them in its own job.
- **CI builds every image and runs the stack.** A new job builds the four
  images with layer caching, starts the whole stack from them with the example
  settings, and runs `scripts/smoke-test`: the site, the public API through the
  proxy, the socket's origin check both ways, district scope both ways, and
  the detector's first alerts from the simulated history. Images are not
  pushed to a registry; nothing yet pulls them, and a deployed demo can build
  from the repository.
- **ARM.** Every base image is published for x86-64 and ARM except
  `postgis/postgis`, which is x86-64 only. `SENTINEL_POSTGIS_IMAGE` swaps it for
  `imresamu/postgis:17-3.5-alpine`, the same build for both, from one of the
  official image's maintainers.

## Consequences

- One command starts the whole system, and on a fresh volume the dashboards
  have alerts within about five minutes, most of it the backfill.
- CI proves on every pull request that the images build, that the stack
  starts from them, and that a report travels from the simulator to an alert
  an inspector can read. That job takes several minutes more than the others.
- The rate limit counts each visitor behind nginx. The header is trusted from
  any private address, and the published port is loopback only, so only a
  process on the same machine can claim another address: in a deployed demo,
  the TLS proxy or tunnel in front. Tomcat reads the header from the right,
  skipping private addresses, so that proxy must put the visitor's real
  address last, whatever the visitor sent: Caddy replaces the header with it,
  and Cloudflare appends it.
- A stack stopped for days and started again has a gap in its reports: the
  simulator posts from the moment it starts, and the backfill sees recent
  history and skips. The baseline then holds too few reports until the gap
  leaves the nine-week window. `down -v` and a fresh start avoids it.
- The refresh cookie is `Secure`. Browsers accept it over plain HTTP from
  `localhost` only, so a demo reached any other way needs HTTPS in front.
- Without the profile, `down` leaves the application's containers running.
  The compose file's header and the README say to add it.
