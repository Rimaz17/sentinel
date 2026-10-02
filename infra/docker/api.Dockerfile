# syntax=docker/dockerfile:1

# The Spring Boot API. Built from the repository root, as infra/docker-compose.yml
# and CI do:
#   docker build -f infra/docker/api.Dockerfile .
#
# Tests are not run here: they start PostgreSQL, Kafka and Redis with
# Testcontainers, which needs Docker inside the build. CI runs them in its own
# job (./mvnw verify).

FROM eclipse-temurin:17-jdk AS build

# Without unzip the Maven wrapper fetches the .tar.gz distribution instead, and
# then fails its checksum, which .mvn/wrapper pins for the .zip.
RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# The wrapper and the POM first, so the dependency layer is downloaded again only
# when they change, not on every source edit.
COPY backend/api/mvnw backend/api/pom.xml ./
COPY backend/api/.mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -ntp -q dependency:go-offline

COPY backend/api/src src
RUN ./mvnw -B -ntp -q package -DskipTests && cp target/sentinel-api-*.jar app.jar


FROM eclipse-temurin:17-jre

# The API never needs root.
RUN groupadd --system sentinel && useradd --system --gid sentinel --no-create-home sentinel

WORKDIR /app
COPY --from=build /build/app.jar app.jar

USER sentinel
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
