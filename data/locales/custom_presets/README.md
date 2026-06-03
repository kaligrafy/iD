# Custom preset locales

Search and display strings for presets built from `data/custom-tagging/src/`.

Each file is a flat map: preset id → `{ "name", "terms", "aliases"? }`, e.g. `highway/footway/footway_link_bicycle_dismount`. The `aliases` field holds search acronyms (`pfl`, `caa`, …) for exact-match ranking in the preset list.

Edit `en.json` and `fr.json` when changing how presets appear or how they are found. English `name` is also read by `preset_name_en.ts` when generating preset JSON.

Loaded with the `tagging` scope via `modules/presets/custom_strings.js` (merged into `presets.presets.*`).

Field labels and other UI strings stay in [`../custom/`](../custom/).
