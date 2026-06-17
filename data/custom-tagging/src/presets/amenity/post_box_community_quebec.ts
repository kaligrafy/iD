import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Québec community mailbox (Postes Canada). Mirrors the NSI "Postes Canada"
// operator entry for amenity=post_box and adds post_box:type=community, since
// the NSI has no community-box variant. Provided as a one-click shortcut because
// Québec has many community mailboxes (avoids setting the type by hand each time).
//
// ⚠ Keep the operator/brand/wikidata in sync with the NSI source if it changes:
// https://github.com/osmlab/name-suggestion-index/blob/main/data/operators/amenity/post_box.json
// (item "Postes Canada", preset id amenity/post_box/postescanada-2241ae)
const ID = 'amenity/post_box/community_quebec';

export const communityMailboxQuebecPreset: CustomPreset = {
    icon: 'temaki-post_box',
    geometry: ['point', 'vertex'],
    fields: ['operator', 'collection_times', 'drive_through', 'ref'],
    moreFields: ['access_simple', 'brand', 'covered', 'height', 'indoor', 'level', 'manufacturer', 'wheelchair'],
    // Matches QC Postes Canada community boxes; the extra post_box:type tag makes
    // it win over the plain NSI operator preset (more matching tags).
    tags: { amenity: 'post_box', 'operator:wikidata': 'Q1032001', 'post_box:type': 'community' },
    addTags: {
        amenity: 'post_box',
        operator: 'Postes Canada',
        'operator:wikidata': 'Q1032001',
        brand: 'Postes Canada',
        'brand:wikidata': 'Q1032001',
        'post_box:type': 'community'
    },
    reference: { key: 'post_box:type', value: 'community' },
    name: presetNameEn(ID)
};

export const communityMailboxQuebecPresets: Record<string, CustomPreset> = {
    [ID]: communityMailboxQuebecPreset
};
