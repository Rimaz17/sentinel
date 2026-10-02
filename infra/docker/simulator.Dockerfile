# syntax=docker/dockerfile:1

# The report simulator. Built from the repository root:
#   docker build -f infra/docker/simulator.Dockerfile .
#
# It needs nothing beyond Python's standard library. It runs `live` unless told
# otherwise, and reads SENTINEL_API_URL and SENTINEL_FEED_KEY from the
# environment.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/simulator/sentinel_simulator sentinel_simulator

RUN useradd --system --no-create-home sentinel
USER sentinel

ENTRYPOINT ["python", "-m", "sentinel_simulator"]
CMD ["live"]
