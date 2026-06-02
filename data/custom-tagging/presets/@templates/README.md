# About `@templates`

Presets in `@templates` are virtual presets used only from inside other presets.

The properties that matter are **`fields`** and **`moreFields`**.

Reference a template in another preset as `"{@templates/<name>}"` (file `presets/@templates/<name>.json`).

You can only copy **fields → fields** and **moreFields → moreFields**.

Other properties on template files are placeholders (see [upstream README](https://github.com/openstreetmap/id-tagging-schema/blob/main/data/presets/@templates/README.md)).
