import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

const LINKS = ['motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'] as const;
type HighwayLink = (typeof LINKS)[number];

/** Parent highway preset used for `{highway/…}` field inheritance (v5 Transition). */
const LINK_PARENT: Record<HighwayLink, string> = {
    motorway_link: 'motorway',
    trunk_link: 'trunk',
    primary_link: 'primary',
    secondary_link: 'secondary',
    tertiary_link: 'tertiary'
};

/** v5 highway link presets (ramps / bretelles) with default asphalt surface. */
function highwayLinkPreset(link: HighwayLink): CustomPreset {
    const parent = LINK_PARENT[link];
    const id = `highway/${link}`;
    const tags = { highway: link };

    return {
        icon: `iD-highway-${parent}-link`,
        geometry: ['line'],
        fields: [`{highway/${parent}}`],
        moreFields: [`{highway/${parent}}`],
        tags,
        addTags: { ...tags, surface: 'asphalt' },
        reference: { key: 'highway', value: link },
        name: presetNameEn(id)
    };
}

export const highwayLinkVariantPresets: Record<string, CustomPreset> = Object.fromEntries(
    LINKS.map((link) => [`highway/${link}`, highwayLinkPreset(link)] as const)
);
