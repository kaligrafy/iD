/** id-tagging-schema geometry values used by custom presets and fields. */
export type PresetGeometry = 'point' | 'line' | 'area' | 'vertex' | 'relation';

/** Custom field definition (id-tagging-schema shape). */
export type CustomField = {
    key: string;
    type?: string;
    label?: string;
    options?: string[];
    minValue?: number;
    placeholder?: string;
    geometry?: PresetGeometry[];
};

/** Custom preset definition: required `tags` plus common optional keys. */
export type CustomPreset = {
    tags: Record<string, string>;
    geometry?: PresetGeometry[];
    fields?: string[];
    moreFields?: string[];
    addTags?: Record<string, string>;
    removeTags?: Record<string, string>;
    name?: string;
    icon?: string;
    matchScore?: number;
    reference?: { key: string; value: string };
    searchable?: boolean;
    locationSet?: { include?: string[]; exclude?: string[] };
};

/** Virtual preset under `presets/@templates/`. */
export type CustomTemplatePreset = CustomPreset & {
    searchable: false;
    tags: { '@template': string } & Record<string, string>;
};
