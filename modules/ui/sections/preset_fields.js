import { dispatch as d3_dispatch } from 'd3-dispatch';

import { presetManager } from '../../presets';
import { t, localizer } from '../../core/localizer';
import { utilArrayIdentical } from '../../util/array';
import { utilArrayUnion, utilRebind } from '../../util';
import { geoExtent } from '../../geo/extent';
import { uiField } from '../field';
import { uiFormFields } from '../form_fields';
import { uiSection } from '../section';

// v6 fork: always show building level fields on any entity tagged `building=*`,
// even when the matched preset isn't a building preset (e.g. `amenity=restaurant`
// + `building=yes`). See `modules/presets/custom_fields.js` `customizeBuildingLevels`,
// which only promotes these fields on building presets themselves.
const BUILDING_LEVEL_FIELD_IDS = ['building/levels', 'building/levels/underground', 'roof/levels'];

export function uiSectionPresetFields(context) {

    var section = uiSection('preset-fields', context)
        .label(() => t.append('inspector.fields'))
        .disclosureContent(renderDisclosureContent);

    var dispatch = d3_dispatch('change', 'revert');
    var formFields = uiFormFields(context);
    var _state;
    var _fieldsArr;
    var _presets = [];
    var _tags;
    var _entityIDs;
    var _hasBuildingTag = false;

    function renderDisclosureContent(selection) {
        if (!_fieldsArr) {

            var graph = context.graph();

            var geometries = Object.keys(_entityIDs.reduce(function(geoms, entityID) {
                geoms[graph.entity(entityID).geometry(graph)] = true;
                return geoms;
            }, {}));

            const loc = _entityIDs.reduce(function(extent, entityID) {
                var entity = context.graph().entity(entityID);
                return extent.extend(entity.extent(context.graph()));
            }, geoExtent()).center();

            var presetsManager = presetManager;

            var allFields = [];
            var allMoreFields = [];
            var sharedTotalFields;

            _presets.forEach(function(preset) {
                var fields = preset.fields(loc);
                var moreFields = preset.moreFields(loc);

                allFields = utilArrayUnion(allFields, fields);
                allMoreFields = utilArrayUnion(allMoreFields, moreFields);

                if (!sharedTotalFields) {
                    sharedTotalFields = utilArrayUnion(fields, moreFields);
                } else {
                    sharedTotalFields = sharedTotalFields.filter(function(field) {
                        return fields.indexOf(field) !== -1 || moreFields.indexOf(field) !== -1;
                    });
                }
            });

            var sharedFields = allFields.filter(function(field) {
                return sharedTotalFields.indexOf(field) !== -1;
            });
            var sharedMoreFields = allMoreFields.filter(function(field) {
                return sharedTotalFields.indexOf(field) !== -1;
            });

            _fieldsArr = [];

            sharedFields.forEach(function(field) {
                if (field.matchAllGeometry(geometries)) {
                    _fieldsArr.push(
                        uiField(context, field, _entityIDs)
                    );
                }
            });

            var singularEntity = _entityIDs.length === 1 && graph.hasEntity(_entityIDs[0]);
            if (singularEntity && singularEntity.type === 'node' && singularEntity.isHighwayIntersection(graph) && presetsManager.field('restrictions')) {
                _fieldsArr.push(
                    uiField(context, presetsManager.field('restrictions'), _entityIDs)
                );
            }

            if (_tags && _tags.building && _tags.building !== 'no') {
                BUILDING_LEVEL_FIELD_IDS.forEach(function(fieldID) {
                    var field = presetsManager.field(fieldID);
                    if (!field || sharedFields.indexOf(field) !== -1) return;  // already shown by the preset itself
                    if (!field.matchAllGeometry(geometries)) return;
                    _fieldsArr.push(
                        uiField(context, field, _entityIDs)
                    );
                });
            }

            var additionalFields = utilArrayUnion(sharedMoreFields, presetsManager.universal());
            additionalFields.sort(function(field1, field2) {
                return field1.title().localeCompare(field2.title(), localizer.localeCode());
            });

            additionalFields.forEach(function(field) {
                if (sharedFields.indexOf(field) === -1 &&
                    field.matchAllGeometry(geometries)) {
                    _fieldsArr.push(
                        uiField(context, field, _entityIDs, { show: false })
                    );
                }
            });

            _fieldsArr.forEach(function(field) {
                field
                    .on('change', function(t, onInput) {
                        dispatch.call('change', field, _entityIDs, t, onInput);
                    })
                    .on('revert', function(keys) {
                        dispatch.call('revert', field, keys);
                    });
            });
        }

        _fieldsArr.forEach(function(field) {
            field
                .state(_state)
                .tags(_tags);
        });


        selection
            .call(formFields
                .fieldsArr(_fieldsArr)
                .state(_state)
                .klass('grouped-items-area')
            );
    }

    section.presets = function(val) {
        if (!arguments.length) return _presets;
        if (!_presets || !val || !utilArrayIdentical(_presets, val)) {
            _presets = val;
            _fieldsArr = null;
        }
        return section;
    };

    section.state = function(val) {
        if (!arguments.length) return _state;
        _state = val;
        return section;
    };

    section.tags = function(val) {
        if (!arguments.length) return _tags;
        _tags = val;
        // Don't reset _fieldsArr here, except when the presence of `building`
        // toggles: that's what decides whether BUILDING_LEVEL_FIELD_IDS show.
        var hasBuildingTag = !!(val && val.building && val.building !== 'no');
        if (hasBuildingTag !== _hasBuildingTag) {
            _hasBuildingTag = hasBuildingTag;
            _fieldsArr = null;
        }
        return section;
    };

    section.entityIDs = function(val) {
        if (!arguments.length) return _entityIDs;
        if (!val || !_entityIDs || !utilArrayIdentical(_entityIDs, val)) {
            _entityIDs = val;
            _fieldsArr = null;
        }
        return section;
    };

    return utilRebind(section, dispatch, 'on');
}
