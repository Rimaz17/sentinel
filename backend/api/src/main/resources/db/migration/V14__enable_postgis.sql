-- PostGIS: geographic points, distances in metres on the Earth's surface, and
-- spatial indexes. The geographic check looks for reports bunched within about
-- 2 km (docs/adr/0020-geographic-check.md), and asks the database how many fall
-- within 2 km of a point and which facility is nearest to one.
--
-- The extension needs the PostGIS image (infra/docker-compose.yml); on a plain
-- PostgreSQL this migration fails, saying the extension is not available. See
-- docs/adr/0019-postgis.md.

create extension if not exists postgis;
