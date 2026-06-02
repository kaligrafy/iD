import { placement } from './fields/placement';
import { cyclewayLink } from './presets/highway/cycleway/cycleway_link';
import { footwayLink } from './presets/highway/footway/footway_link';
import { footwayLinkBicycleDismount } from './presets/highway/footway/footway_link_bicycle_dismount';
import { footwayLinkBicycleYes } from './presets/highway/footway/footway_link_bicycle_yes';
import { placementLineTemplate } from './presets/templates/placement_line';
import type { CustomField, CustomPreset, CustomTemplatePreset } from './types';

/** Field id → definition. Each entry becomes `fields/<id>.json`. */
export const customFields: Record<string, CustomField> = {
    placement
};

/** Template name (filename without .json) → virtual preset under `presets/@templates/`. */
export const customTemplates: Record<string, CustomTemplatePreset> = {
    placement_line: placementLineTemplate
};

/** Preset path (e.g. `highway/footway/footway_link`) → definition under `presets/`. */
export const customPresets: Record<string, CustomPreset> = {
    'highway/footway/footway_link': footwayLink,
    'highway/footway/footway_link_bicycle_dismount': footwayLinkBicycleDismount,
    'highway/footway/footway_link_bicycle_yes': footwayLinkBicycleYes,
    'highway/cycleway/cycleway_link': cyclewayLink
};
