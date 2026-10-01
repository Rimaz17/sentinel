# 0016, Alerts pushed over WebSocket

Status: accepted · 2026-09-30

## Context

Phase 3's dashboard polled every panel every 30 seconds (ADR 0009). Phase 5
pushes alerts to the browser over WebSocket (STOMP) instead. Three things had
to be decided: how the API learns an alert was raised, since the detector is a
separate Python job that writes straight to the alerts table; how a push is
kept within an inspector's districts, which every query already enforces; and
what the dashboard does when the socket is not open.

## Decision

- **A trigger announces every alert change, on commit.** A Flyway migration
  (V12) adds a trigger on the alerts table that calls `pg_notify` with
  `RAISED A-1001` or `UPDATED A-1001`. PostgreSQL delivers a notification only
  when the writing transaction commits, and drops it on rollback, so nobody is
  told of an alert that was never written. It covers every writer without their
  knowing: the detector raising and extending alerts, and inspectors moving them
  on through the API. An update that changes nothing announces nothing.
- **The API listens on a connection of its own**, outside the pool, and reads
  the alert each notice names. If the connection is lost it reconnects after
  five seconds and tells every dashboard to read its alerts afresh (`RESYNC`),
  since a change made meanwhile was announced to no one.
- **STOMP over a plain WebSocket at `/api/ws`**, with Spring's in-memory
  broker. Browsers cannot put a token on the WebSocket handshake, so the
  handshake is open and the STOMP CONNECT frame carries the access token in an
  `Authorization` header, as a request would. Only an inspector's token is
  accepted. A connection may subscribe to `/user/queue/alerts` and nothing else,
  and may never send. Anything refused ends the connection with an ERROR frame
  that says why. The handshake is same-origin only; the dashboard's dev and
  preview servers pass it on with the browser's own Host header, so it passes
  without a CORS setting.
- **Scope is enforced on every message, not on the subscription.** Each
  connection has a name of its own and carries its token's districts and
  expiry. For each change, the API sends only to connections whose districts
  cover the alert and whose token has not expired, exactly as a request would be
  refused. A Kandy inspector is never sent a Colombo alert.
- **The event is the alert as `GET /api/alerts` returns it**, with the kind of
  change: `{"change": "RAISED", "alert": {...}}`. The dashboard does not patch
  its list from it; it reads the alerts and district counts afresh, so the list
  stays exactly what the API returns, in the API's order, within scope.
- **The dashboard takes alerts from the socket and polls only without it.**
  While the socket is open the alert list does not poll; while it is
  connecting, or reconnecting (tried every five seconds), the list polls every
  30 seconds as before. Each connection reads the alerts afresh, covering whatever
  changed while it was closed. The header says which it is, in words: "alerts
  arrive live", "connecting for live alerts", "live alerts reconnecting". A new
  alert is announced to screen readers ("New alert A-1002: Kandy, dengue-like.").
- **The socket follows the page's token.** The API stops pushing to a
  connection once its token expires, so whenever the page renews its token, the
  socket reconnects with the new one. The socket itself never renews a token:
  a tab left alone is signed out as before.
- **Only alerts are pushed.** Report counts, map dots and charts still poll every
  30 seconds; the build plan asks for alerts, and reports arrive far too often
  to push one message each.
- **The public dashboard does not use the socket.** Its alerts change only when
  an inspector confirms one or a rise passes the higher threshold; it keeps
  refreshing every minute and stays a page that needs no connection held open.

## Consequences

- An alert reaches an inspector's screen a moment after the detector commits
  it, instead of up to 30 seconds later, and an acknowledgement by one inspector
  shows on the others' screens at once.
- Heartbeats every ten seconds each way drop a connection that died without
  closing within about half a minute.
- Scope is only as fresh as the token: narrowing an inspector's districts takes
  effect at their next renewal, at most 15 minutes, as for requests (ADR 0011).
- The broker is in memory, so a second API instance would need its own
  listener, which it has: each instance listens and pushes to its own
  connections, and no broker relay is needed.
- A notification is lost if no API is listening when it is sent. Every
  connection that opens afterwards reads its alerts afresh, so what is lost is
  the moment, not the alert.

## Alternatives considered

- **The detector publishes alerts to a Kafka topic.** Kafka is already in the
  stack, but the detector would need a Kafka client, and writing the row and
  publishing the event are two steps, so one can succeed while the other fails.
  The trigger fires with the commit itself and needs nothing from the detector.
- **Poll the alerts table from the API and push what changed.** No trigger, but
  it is polling moved into the server, with its delay.
- **Topics per district, with each subscription checked.** Fewer messages, but
  scope would be checked once, at subscription, and a national inspector would
  subscribe 25 times. Checking each message costs nothing at this volume and
  also stops pushes to an expired token.
- **Put the token in the handshake URL.** Browsers can, but URLs end up in
  server and proxy logs.
- **SockJS.** Every browser the dashboard supports has WebSocket.
