# Pipeline measurement

Measures two of the project's success figures: **throughput**, the reports a
second the pipeline sustains without reports piling up on the stream, and
**end-to-end latency**, the time from a report being submitted to it being
stored and counted.

It submits simulated reports through the API's report feed at a steady rate,
as the simulator does, from several submitters at once. Every second it counts
how many accepted reports are not yet stored: the stream processor's lag. When
sending ends it waits for everything to be stored, then reads each report's
`stored_at` and sets it against the moment the report was sent. Both times come
from the same machine's clock, so run it on the machine the API runs on.

A rate counts as **sustained** when every report was accepted, submissions kept
within 3% of the target rate, no more than one second's worth of reports was
waiting when sending ended, and all of them were stored within two seconds
after.

## Run it

**It adds real reports.** Run it against a throwaway stack, with nothing else
submitting while it runs: the lag count includes every report received since
the run began.

It reads `SENTINEL_FEED_KEY` and the three `SENTINEL_DB_*` settings the same
way as the simulator and the detector: from the environment, or from the
repository's `.env`. From this directory:

```bash
pip install -r requirements.txt
```

```bash
python measure_pipeline.py --rates 25,50,100,200,400,800 --seconds 30
```

| Option | Meaning |
|---|---|
| `--rates` | Reports a second to try, in turn (default `25,50,100,200`) |
| `--seconds` | How long each rate runs (default 30) |
| `--workers` | Concurrent submitters (default 16) |
| `--api-url` | The API (default `http://localhost:8080`) |
| `--seed` | Makes the simulated reports repeatable (default 2026) |

On Windows, write the database host in `SENTINEL_DB_URL` as `127.0.0.1` rather
than `localhost`. Docker publishes the port on IPv4 only, and a connection to
`localhost` tries IPv6 first and can wait twenty seconds or more before falling
back.

## Checks

```bash
pip install -r requirements-dev.txt
```

```bash
pytest
```

```bash
ruff check .
```

```bash
black --check .
```
