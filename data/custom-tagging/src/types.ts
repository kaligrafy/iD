/** Geometry types accepted by id-tagging-schema presets. */
export type PresetGeometry = 'point' | 'vertex' | 'line' | 'area' | 'relation';

/** Single-tag prerequisite (schema-builder JSON subset). */
export interface PrerequisiteTag {
    key: string;
    value?: string;
    valueNot?: string;
    values?: string[];
    valuesNot?: string[];
    keyNot?: string;
}

/** Field definition authored in TypeScript, compiled to data/presets/custom/fields/*.json */
export interface CustomField {
    key: string;
    type: string;
    label?: string;
    geometry?: PresetGeometry[];
    prerequisiteTag?: PrerequisiteTag | { allOf: PrerequisiteTag[] };
    keys?: string[];
    options?: string[];
    universal?: boolean;
    placeholder?: string;
    terms?: string[];
}

/** Full preset definition (compiled to data/presets/custom/presets/<path>.json). */
export interface CustomPreset {
    name: string;
    geometry: PresetGeometry[];
    tags: Record<string, string>;
    icon?: string;
    fields?: string[];
    moreFields?: string[];
    addTags?: Record<string, string>;
    reference?: { key: string; value?: string };
    terms?: string[];
    matchScore?: number;
    searchable?: boolean;
}

/** Virtual @templates preset (fields / moreFields only). */
export interface CustomTemplatePreset {
    fields?: string[];
    moreFields?: string[];
    geometry: PresetGeometry[];
    tags: Record<string, string>;
    searchable: false;
    locationSet?: { include?: string[]; exclude?: string[] };
    name: string;
}
