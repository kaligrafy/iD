import type { CustomPreset } from '../../types';
import { presetNameEn } from '../../preset_name_en';

// Private, unmaintained track (highway=track + access=private), defaulting to an
// unpaved surface. Unrelated to the service-road family but ported alongside it.
const ID = 'highway/track_private';

export const trackPrivatePreset: CustomPreset = {
    icon: 'fas-truck-monster',
    geometry: ['line'],
    fields: ['{highway/track}'],
    moreFields: ['{highway/track}'],
    tags: { highway: 'track', access: 'private' },
    addTags: { highway: 'track', access: 'private', surface: 'unpaved' },
    reference: { key: 'highway', value: 'track' },
    name: presetNameEn(ID)
};

export const trackPrivatePresets: Record<string, CustomPreset> = {
    [ID]: trackPrivatePreset
};
