# Custom presets (Chaire Mobilité)

Fork-specific [OpenStreetMap tagging schema](https://github.com/openstreetmap/id-tagging-schema) data. Same layout and tooling as upstream iD (`@openstreetmap/id-tagging-schema` + [`@ideditor/schema-builder`](https://github.com/ideditor/schema-builder)).

Upstream presets still load from the npm package at runtime. This tree is **merged on top** after the schema is loaded (`modules/presets/apply_custom_presets.ts`), then Québec-specific field wiring runs in `modules/presets/custom_fields.js`.

## Layout

```
data/custom-tagging/
├── README.md
├── src/                          Author here (TypeScript)
│   ├── types.ts
│   ├── registry.ts               Registers fields, @templates, presets
│   ├── fields/*.ts
│   └── presets/.../*.ts
├── deprecated.json               Static (checked in)
├── discarded.json
├── preset_defaults.json
├── fields/*.json                 Generated (gitignored) → fields.min.json
└── presets/**/*.json             Generated (gitignored) → presets.min.json

dist/data/custom/                 Build output (gitignored except in deploy)
├── fields.min.json
└── presets.min.json

data/locales/custom_presets/      Preset name + search terms (en, fr)
data/locales/custom/              Field labels, UI, validator messages
```

Preset IDs follow the path under `presets/`, e.g. `presets/highway/footway/footway_link.json` → `highway/footway/footway_link`.

## Runtime

1. `presetManager.ensureLoaded()` loads upstream schema from CDN.
2. `applyCustomPresets()` fetches `data/custom/fields.min.json` and `presets.min.json` (paths are relative to `assetPath`, e.g. `dist/data/custom/...`).
3. `applyCustomFields()` merges hand-written fields from `custom_fields.js` and attaches lane/sidewalk blocks to road presets.

Preset `name` / `terms` are **not** in `presets.min.json`; they live in [`data/locales/custom_presets/`](../locales/custom_presets/) and are registered by `modules/presets/custom_strings.js`.

## `@templates`

Virtual presets referenced from other presets, e.g. `"{@templates/placement_line}"`. See upstream [data/presets/@templates/README.md](https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/@templates/README.md).

Parent preset field lists can reference upstream presets with `{highway/footway}`; `scripts/custom_presets_config.js` expands those before schema-builder runs.

## Locales

| What | Where |
|------|--------|
| English field labels from TS | `label` on field definitions in `src/fields/` |
| Preset `name` / `terms` | [`data/locales/custom_presets/{locale}.json`](../locales/custom_presets/) |
| Custom field labels, UI, issues | [`data/locales/custom/{locale}.json`](../locales/custom/) (`tagging` or `general` scope) |

See also [data/locales/custom_presets/README.md](../locales/custom_presets/README.md).

## Build

```bash
npm run build:presets:custom
```

1. `tsx scripts/compile_custom_presets_sources.ts` — writes `fields/*.json` and `presets/**/*.json` from `src/`
2. `@ideditor/schema-builder` (`scripts/build_custom_presets.ts`) — writes `dist/data/custom/*.min.json`

`npm run build` and `npm run all` run `build:presets:custom` before `build:data`.

## Validate

```bash
npm run validate:presets:custom
```

## Tests

```bash
npm run test:spec -- test/spec/presets/custom_presets.js test/spec/presets/custom_presets_search.js
```

## Adding a field or preset

1. Add `src/fields/my_field.ts` or `src/presets/.../my_preset.ts`.
2. Register it in `src/registry.ts` (`customFields`, `customTemplates`, or `customPresets`).
3. Add `name` / `terms` in `data/locales/custom_presets/{en,fr}.json` (and field/UI strings in `data/locales/custom/` if needed).
4. Run `npm run build:presets:custom` (or full `npm run build`).

**Shipped today (v5 parity):**

| Preset ID | Shortcut (`data/preset_shortcuts_defaults.json`) |
|-----------|--------------------------------------------------|
| `highway/footway/footway_link` | `i` |
| `highway/footway/footway_link_bicycle_dismount` | — |
| `highway/footway/footway_link_bicycle_yes` | — |
| `highway/cycleway/cycleway_link` | `N` (Shift+Alt+N) |

Fields with `prerequisiteTag.allOf` are not valid in schema JSON yet; keep those in `modules/presets/custom_fields.js` until schema-builder supports them.

## References

- [id-tagging-schema CONTRIBUTING](https://github.com/openstreetmap/id-tagging-schema/blob/main/CONTRIBUTING.md)
- [schema-builder README](https://github.com/ideditor/schema-builder/blob/main/README.md)
- Build wiring: `scripts/custom_presets_config.js`, `scripts/build_custom_presets.ts`
