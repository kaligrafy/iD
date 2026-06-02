# Imagery extent polygons

GeoJSON boundaries used by `data/manual_imagery.json` entries (via `polygonFile`) so
regional layers only appear in the background list when the map view intersects that
area. Same pattern as polygon-clipped sources in `@openstreetmap/editor-layer-index`.

## `quebec.geojson`

Simplified boundary of Québec (admin level 4), derived from OpenStreetMap via
[Nominatim](https://nominatim.openstreetmap.org/) and simplified with `ogr2ogr -simplify 0.08`.
Regenerate only when the administrative boundary changes materially.
