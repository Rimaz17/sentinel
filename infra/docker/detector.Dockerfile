# syntax=docker/dockerfile:1

# The detector: the hourly z-score check and the geographic check. Built from
# the repository root:
#   docker build -f infra/docker/detector.Dockerfile .
#
# It runs `watch` unless told otherwise, and reads SENTINEL_DB_URL,
# SENTINEL_DB_USERNAME and SENTINEL_DB_PASSWORD from the environment. The
# evaluations need the simulator alongside, so they are run from a checkout,
# not from this image.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore

WORKDIR /app

COPY backend/detector/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/detector/sentinel_detector sentinel_detector

RUN useradd --system --no-create-home sentinel
USER sentinel

ENTRYPOINT ["python", "-m", "sentinel_detector"]
CMD ["watch"]
