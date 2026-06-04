import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';
import {
    SIDEWALK_VARIANT_TAGS,
    SIDEWALK_USE_SIDEPATH,
    type SidewalkVariant
} from './sidewalk_variant_tags';

/** Road classes that get the Québec `foot=use_sidepath` sidewalk variants. */
const STREETS = ['primary', 'residential', 'secondary', 'tertiary', 'trunk', 'unclassified'] as const;

const VARIANTS: SidewalkVariant[] = ['both', 'left', 'right', 'opposite', 'no'];

/** Preset id: `opposite` keeps the v5 `-opposite-use_sidepath` suffix. */
function streetId(highway: string, variant: SidewalkVariant): string {
    return variant === 'opposite'
        ? `highway/${highway}-opposite-use_sidepath`
        : `highway/${highway}_sidewalk_${variant}`;
}

function streetPreset(highway: string, variant: SidewalkVariant): CustomPreset {
    const useSidepath = SIDEWALK_USE_SIDEPATH[variant];
    const tags: Record<string, string> = {
        highway,
        ...(useSidepath ? { foot: 'use_sidepath' } : {}),
        ...SIDEWALK_VARIANT_TAGS[variant]
    };

    return {
        icon: `iD-highway-${highway}`,
        geometry: ['line'],
        fields: [`{highway/${highway}}`],
        moreFields: [`{highway/${highway}}`],
        tags,
        addTags: { ...tags, surface: 'asphalt' },
        // Only force-remove foot=use_sidepath on preset change; sidewalk tags are
        // managed by the shared sidewalk field, which iD preserves (preserveKeys).
        removeTags: useSidepath ? { foot: 'use_sidepath' } : {},
        reference: { key: 'highway', value: highway },
        name: presetNameEn(streetId(highway, variant))
    };
}

export const streetSidewalkVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    STREETS.flatMap((highway) =>
        VARIANTS.map((variant) => [streetId(highway, variant), streetPreset(highway, variant)] as const)
    )
);
