import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

/** Road classes that get the Québec `foot=use_sidepath` sidewalk variants. */
const STREETS = ['primary', 'residential', 'secondary', 'tertiary', 'trunk', 'unclassified'] as const;

type SidewalkVariant = 'both' | 'left' | 'right' | 'opposite' | 'no';

const VARIANTS: SidewalkVariant[] = ['both', 'left', 'right', 'opposite', 'no'];

/** Sidewalk tags per variant (added to `highway`, plus `foot=use_sidepath` where it applies). */
const VARIANT_TAGS: Record<SidewalkVariant, Record<string, string>> = {
    both: { 'sidewalk:both': 'separate' },
    left: { 'sidewalk:left': 'separate', 'sidewalk:right': 'no' },
    right: { 'sidewalk:left': 'no', 'sidewalk:right': 'separate' },
    // Divided road whose sidewalk is mapped along the opposite carriageway.
    opposite: { sidewalk: 'no', dual_carriageway: 'yes' },
    // Road with no sidewalk at all (no separate sidepath to use).
    no: { sidewalk: 'no' }
};

/** Variants where a separate sidepath exists, so the road carries `foot=use_sidepath`. */
const USE_SIDEPATH: Record<SidewalkVariant, boolean> = {
    both: true,
    left: true,
    right: true,
    opposite: true,
    no: false
};

/** Preset id: `opposite` keeps the v5 `-opposite-use_sidepath` suffix. */
function streetId(highway: string, variant: SidewalkVariant): string {
    return variant === 'opposite'
        ? `highway/${highway}-opposite-use_sidepath`
        : `highway/${highway}_sidewalk_${variant}`;
}

function streetPreset(highway: string, variant: SidewalkVariant): CustomPreset {
    const useSidepath = USE_SIDEPATH[variant];
    const tags: Record<string, string> = {
        highway,
        ...(useSidepath ? { foot: 'use_sidepath' } : {}),
        ...VARIANT_TAGS[variant]
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
