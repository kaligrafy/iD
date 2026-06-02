# Custom preset locales

`name` and `terms` for presets built from `data/custom-tagging/` (search labels in the preset list).

Each file is a flat map: preset id → `{ "name", "terms" }`, e.g. `highway/footway/footway_link`.

Loaded with the `tagging` scope via `modules/presets/custom_strings.js` (merged into `presets.presets.*`).

Field labels and other UI strings stay in [`../custom/`](../custom/).
