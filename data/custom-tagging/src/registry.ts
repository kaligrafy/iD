import { accessRestricted } from './fields/access_restricted';
import { capacityCharging } from './fields/capacity_charging';
import { parkingCondition } from './fields/parking_condition';
import { placement } from './fields/placement';
import { bicycleDismountVariantPresets } from './presets/highway/footway/bicycle_dismount_variants';
import { accessAisleVariantPresets } from './presets/highway/footway/access_aisle_variants';
import { footwayLinkVariantPresets } from './presets/highway/footway/footway_link_variants';
import { footwayCrossingVariantPresets } from './presets/highway/footway/footway_crossing_variants';
import { sidewalkVariantPresets } from './presets/highway/footway/sidewalk_variants';
import { restrictedFootwayVariantPresets } from './presets/highway/footway/restricted_footway_variants';
import { streetSidewalkVariantPresets } from './presets/highway/street_sidewalk_variants';
import { serviceVariantPresets } from './presets/highway/service_variants';
import { trackPrivatePresets } from './presets/highway/track_private';
import { stepsVariantPresets } from './presets/highway/steps_variants';
import { cyclewayCrossingVariantPresets } from './presets/highway/cycleway/cycleway_crossing_variants';
import { cyclewayLink } from './presets/highway/cycleway/cycleway_link';
import { parkingVariantPresets } from './presets/amenity/parking_variants';
import { accessBarrierPresets } from './presets/barrier/access_barriers';
import { constructionCompanyPresets } from './presets/office/construction_company';
import { companyConstructionPresets } from './presets/office/company_construction';
import { publicWorksPresets } from './presets/office/government/public_works';
import { institutionalPresets } from './presets/landuse/institutional';
import { landusePublicWorksPresets } from './presets/landuse/public_works';
import { busCompanyPresets } from './presets/office/company_bus';
import { logisticsPresets } from './presets/office/logistics';
import { truckingPresets } from './presets/industrial/trucking';
import { distributorPresets } from './presets/industrial/distributor';
import { truckShopPresets } from './presets/shop/truck';
import { communityMailboxQuebecPresets } from './presets/amenity/post_box_community_quebec';
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
    ...bicycleDismountVariantPresets,
    ...accessAisleVariantPresets,
    ...footwayLinkVariantPresets,
    ...restrictedFootwayVariantPresets,
    ...sidewalkVariantPresets,
    ...footwayCrossingVariantPresets,
    ...streetSidewalkVariantPresets,
    ...serviceVariantPresets,
    ...trackPrivatePresets,
    ...stepsVariantPresets,
    'highway/cycleway/cycleway_link': cyclewayLink,
    ...cyclewayCrossingVariantPresets,
    ...parkingVariantPresets,
    ...accessBarrierPresets,
    ...constructionCompanyPresets,
    ...companyConstructionPresets,
    ...publicWorksPresets,
    ...institutionalPresets,
    ...landusePublicWorksPresets,
    ...busCompanyPresets,
    ...logisticsPresets,
    ...truckingPresets,
    ...distributorPresets,
    ...truckShopPresets,
    ...communityMailboxQuebecPresets
};
