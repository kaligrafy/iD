/** id-tagging-schema geometry values used by custom presets and fields. */
export type PresetGeometry = 'point' | 'line' | 'area' | 'vertex' | 'relation';

/** Field input types supported by schema-builder. */
export type CustomFieldType =
    | 'access'
    | 'address'
    | 'check'
    | 'combo'
    | 'date'
    | 'directionalCombo'
    | 'email'
    | 'identifier'
    | 'lanes'
    | 'localized'
    | 'manyCombo'
    | 'multiCombo'
    | 'networkCombo'
    | 'number'
    | 'radio'
    | 'roadheight'
    | 'roadspeed'
    | 'semiCombo'
    | 'tel'
    | 'text'
    | 'textarea'
    | 'typeCombo'
    | 'url'
    | 'wikidata'
    | 'wikipedia';

/** Wiki tag reference (key/value) backing a preset documentation link. */
export type PresetReference = { key: string; value: string };

/** Custom field definition (id-tagging-schema shape). */
export type CustomField = {
    key: string;
    type?: CustomFieldType;
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
    reference?: PresetReference;
    searchable?: boolean;
    locationSet?: { include?: string[]; exclude?: string[] };
};

/** Virtual preset under `presets/@templates/`. */
export type CustomTemplatePreset = CustomPreset & {
    searchable: false;
    tags: { '@template': string } & Record<string, string>;
};
