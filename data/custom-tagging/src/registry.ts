import { accessRestricted } from './fields/access_restricted';
import { capacityCharging } from './fields/capacity_charging';
import { parkingCondition } from './fields/parking_condition';
import { placement } from './fields/placement';
import { accessAisleVariantPresets } from './presets/highway/footway/access_aisle_variants';
import { footwayLinkVariantPresets } from './presets/highway/footway/footway_link_variants';
import { cyclewayLink } from './presets/highway/cycleway/cycleway_link';
import { parkingVariantPresets } from './presets/amenity/parking_variants';
import { accessBarrierPresets } from './presets/barrier/access_barriers';
import { placementLineTemplate } from './presets/templates/placement_line';
import type { CustomField, CustomPreset, CustomTemplatePreset } from './types';

/** Field id → definition. Each entry becomes `fields/<id>.json`. */
export const customFields: Record<string, CustomField> = {
    placement,
    access_restricted: accessRestricted,
    capacity_charging: capacityCharging,
    'parking/condition': parkingCondition
};

/** Template name (filename without .json) → virtual preset under `presets/@templates/`. */
export const customTemplates: Record<string, CustomTemplatePreset> = {
    placement_line: placementLineTemplate
};

/** Preset path (e.g. `highway/footway/footway_link_bicycle_dismount`) → definition under `presets/`. */
export const customPresets: Record<string, CustomPreset> = {
    ...accessAisleVariantPresets,
    ...footwayLinkVariantPresets,
    'highway/cycleway/cycleway_link': cyclewayLink,
    ...parkingVariantPresets,
    ...accessBarrierPresets
};
