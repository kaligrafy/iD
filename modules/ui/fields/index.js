export * from './check';
export * from './combo';
export * from './input';
export * from './access';
export * from './address';
export * from './bus_lanes';
export * from './directional_combo';
export * from './lanes';
export * from './lane_list';
export * from './lane_patterns';
export * from './lane_warnings';
export * from './localized';
export * from './roadheight';
export * from './roadspeed';
export * from './radio';
export * from './sidewalk';
export * from './restrictions';
export * from './textarea';
export * from './wikidata';
export * from './wikipedia';

import {
    uiFieldCheck,
    uiFieldDefaultCheck,
    uiFieldOnewayCheck
} from './check';

import {
    uiFieldCombo,
    uiFieldManyCombo,
    uiFieldMultiCombo,
    uiFieldNetworkCombo,
    uiFieldSemiCombo,
    uiFieldTypeCombo
} from './combo';

import {
    uiFieldColour,
    uiFieldEmail,
    uiFieldIdentifier,
    uiFieldNumber,
    uiFieldSchedule,
    uiFieldTel,
    uiFieldText,
    uiFieldUrl
} from './input';

import {
    uiFieldRadio,
    uiFieldStructureRadio
} from './radio';

import { uiFieldAccess } from './access';
import { uiFieldAddress } from './address';
import { uiFieldBusLanes } from './bus_lanes';
import { uiFieldDirectionalCombo } from './directional_combo';
import { uiFieldDirectionalGroup } from './directional_group';
import { uiFieldLanes } from './lanes';
import { uiFieldLaneList } from './lane_list';
import { uiFieldLocalized } from './localized';
import { uiFieldRoadheight } from './roadheight';
import { uiFieldRoadspeed } from './roadspeed';
import { uiFieldRestrictions } from './restrictions';
import { uiFieldSidewalk } from './sidewalk';
import { uiFieldTextarea } from './textarea';
import { uiFieldWikidata } from './wikidata';
import { uiFieldWikipedia } from './wikipedia';

export var uiFields = {
    access: uiFieldAccess,
    address: uiFieldAddress,
    buswaylanes: uiFieldBusLanes,
    check: uiFieldCheck,
    colour: uiFieldColour,
    combo: uiFieldCombo,
    cycleway: uiFieldDirectionalCombo,
    date: uiFieldText,
    defaultCheck: uiFieldDefaultCheck,
    directionalCombo: uiFieldDirectionalCombo,
    directionalGroup: uiFieldDirectionalGroup,
    email: uiFieldEmail,
    identifier: uiFieldIdentifier,
    laneList: uiFieldLaneList,
    lanes: uiFieldLanes,
    localized: uiFieldLocalized,
    manyCombo: uiFieldManyCombo,
    multiCombo: uiFieldMultiCombo,
    networkCombo: uiFieldNetworkCombo,
    number: uiFieldNumber,
    onewayCheck: uiFieldOnewayCheck,
    radio: uiFieldRadio,
    restrictions: uiFieldRestrictions,
    roadheight: uiFieldRoadheight,
    roadspeed: uiFieldRoadspeed,
    schedule: uiFieldSchedule,
    semiCombo: uiFieldSemiCombo,
    sidewalk: uiFieldSidewalk,
    structureRadio: uiFieldStructureRadio,
    tel: uiFieldTel,
    text: uiFieldText,
    textarea: uiFieldTextarea,
    typeCombo: uiFieldTypeCombo,
    url: uiFieldUrl,
    wikidata: uiFieldWikidata,
    wikipedia: uiFieldWikipedia
};
