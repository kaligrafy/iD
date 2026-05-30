import { t } from '../core/localizer';
import { actionClone } from '../actions/clone';
import { behaviorOperation } from '../behavior/operation';

/** A clone type: the menu/i18n id, the tags it copies, and optional extras. */
interface CloneType {
    id: string;
    tags: string[];
    /** Language suffixes (e.g. ['fr','en']) whose `<tag>:<suffix>` variants are also copied. */
    languageSuffixes?: string[];
    /** Keyboard shortcut. Left undefined for now; set it to enable a per-type shortcut. */
    key?: string;
}

/**
 * Clone types. To give a type its own keyboard shortcut later,
 * just add a `key` here — it is wired automatically through `behaviorOperation`.
 */
export const cloneTypes: CloneType[] = [
    { id: 'clone_address', tags: [
        'addr:housenumber', 'addr:housename', 'addr:street', 'addr:city', 'addr:province',
        'addr:borough', 'addr:postcode', 'addr:source', 'addr:suburb', 'addr:state',
        'addr:place', 'addr:full', 'addr:county', 'addr:district', 'addr:hamlet', 'addr:subdistrict',
        'contact:housenumber', 'contact:housename', 'contact:street', 'contact:city', 'contact:province',
        'contact:borough', 'contact:postcode', 'contact:source', 'contact:suburb', 'contact:state',
        'contact:place', 'contact:full', 'contact:county', 'contact:district', 'contact:hamlet',
        'contact:subdistrict', 'contact:country'
    ] },
    { id: 'clone_name', tags: [
        'name', 'operator', 'alt_name', 'old_name', 'short_name', 'official_name', 'int_name',
        'loc_name', 'name:left', 'name:right', 'nat_name', 'ref_name', 'reg_name', 'sorting_name', 'nickname'
    ], languageSuffixes: ['fr', 'en'] },
    { id: 'clone_lanes', tags: ['lanes', 'lanes:forward', 'lanes:backward'] },
    { id: 'clone_turn_lanes', tags: ['turn:lanes', 'turn:lanes:forward', 'turn:lanes:backward'] },
    { id: 'clone_sidewalk', tags: ['sidewalk', 'sidewalk:both', 'sidewalk:right', 'sidewalk:left', 'foot'] },
    { id: 'clone_cycleway', tags: [
        'bicycle', 'cycleway', 'cycleway:both', 'cycleway:right', 'cycleway:buffer', 'cycleway:marking',
        'cycleway:right:marking', 'cycleway:left:marking', 'cycleway:separation', 'cycleway:right:separation',
        'cycleway:right:buffer', 'cycleway:right:oneway', 'cycleway:left:separation', 'cycleway:left:buffer',
        'cycleway:left:oneway', 'cycleway:left', 'oneway:bicycle', 'lcn'
    ] },
    { id: 'clone_bicycle_tag', tags: ['bicycle'] },
    { id: 'clone_bus_lanes', tags: [
        'bus:lanes', 'bus:lanes:forward', 'bus:lanes:backward', 'lanes:bus', 'lanes:bus:forward',
        'lanes:bus:backward', 'busway:right', 'busway:left', 'routing:bus', 'bus'
    ] },
    { id: 'clone_transition', tags: [
        'placement', 'placement:start', 'placement:end', 'width:lanes:start', 'width:lanes:end',
        'placement:forward', 'width:lanes:forward:start', 'width:lanes:forward:end',
        'placement:backward', 'width:lanes:backward:start', 'width:lanes:backward:end'
    ] },
    { id: 'clone_maxspeed', tags: ['maxspeed'] },
    { id: 'clone_surface', tags: ['surface'] },
    { id: 'clone_dual_carriageway', tags: ['dual_carriageway'] }
];

/** True when at least one of `tags` is set on the source (first selected) entity. */
function sourceHasAnyTag(context: iD.Context, selectedIDs: EntityID[], tags: string[]): boolean {
    if (selectedIDs.length < 2) return false;
    const source = context.hasEntity(selectedIDs[0]);
    return !!source && tags.some((tag) => source.tags[tag] !== undefined);
}

/**
 * Build a clone sub-operation for one `CloneType`. These are hidden from the
 * edit menu's top level (`hiddenFromEditMenu`) and surfaced inside the `clone`
 * submenu, but they are still registered so their (future) shortcut works.
 *
 * @param type - the clone type configuration
 * @returns an operation factory `(context, selectedIDs) => operation`
 */
function makeCloneOperation(type: CloneType) {
    return function (context: iD.Context, selectedIDs: EntityID[]) {

        const action = actionClone(selectedIDs, type.tags, type.languageSuffixes);

        function operation() {
            context.perform(action, operation.annotation());

            window.setTimeout(function () {
                context.validator().validate();
            }, 300);  // after any transition
        }

        operation.available = function (): boolean {
            return sourceHasAnyTag(context, selectedIDs, type.tags);
        };

        operation.disabled = function (): boolean {
            return false;
        };

        operation.tooltip = function () {
            return t.append('operations.' + type.id + '.description');
        };

        operation.annotation = function (): string {
            return t('operations.' + type.id + '.annotation');
        };

        operation.id = type.id;
        operation.keys = (type.key ? [type.key] : []) as string[];
        operation.title = t.append('operations.' + type.id + '.title');
        operation.icon = function (): string {
            return '#iD-operation-clone';
        };
        operation.hiddenFromEditMenu = true;
        operation.behavior = behaviorOperation(context).which(operation);

        return operation;
    };
}

/**
 * Container operation shown in the edit menu. Clicking it opens a submenu (see
 * `uiEditMenu`) listing the available clone sub-operations. It performs nothing
 * on its own.
 *
 * @param context - the iD application context
 * @param selectedIDs - currently selected entity ids
 * @returns the container operation, with `subOperations()` for the submenu
 */
export function operationClone(context: iD.Context, selectedIDs: EntityID[]) {

    function operation() {
        // no-op: the edit menu opens the submenu via operation.subOperations()
    }

    operation.available = function (): boolean {
        return cloneTypes.some((type) => sourceHasAnyTag(context, selectedIDs, type.tags));
    };

    operation.disabled = function (): boolean {
        return false;
    };

    operation.tooltip = function () {
        return t.append('operations.clone.description');
    };

    operation.annotation = function (): string {
        return t('operations.clone.annotation');
    };

    operation.id = 'clone';
    operation.keys = [] as string[];
    operation.title = t.append('operations.clone.title');
    operation.behavior = behaviorOperation(context).which(operation);

    /** Available clone sub-operations, listed in the submenu. */
    operation.subOperations = function () {
        return cloneTypes
            .map((type) => makeCloneOperation(type)(context, selectedIDs))
            .filter((subOp) => subOp.available());
    };

    return operation;
}

// Individual sub-operations, exported so the mode installs their keybindings.
// They stay hidden from the edit menu's top level and appear in the clone submenu.
export const operationCloneAddress = makeCloneOperation(cloneTypes[0]);
export const operationCloneName = makeCloneOperation(cloneTypes[1]);
export const operationCloneLanes = makeCloneOperation(cloneTypes[2]);
export const operationCloneTurnLanes = makeCloneOperation(cloneTypes[3]);
export const operationCloneSidewalk = makeCloneOperation(cloneTypes[4]);
export const operationCloneCycleway = makeCloneOperation(cloneTypes[5]);
export const operationCloneBicycleTag = makeCloneOperation(cloneTypes[6]);
export const operationCloneBusLanes = makeCloneOperation(cloneTypes[7]);
export const operationCloneTransition = makeCloneOperation(cloneTypes[8]);
export const operationCloneMaxspeed = makeCloneOperation(cloneTypes[9]);
export const operationCloneSurface = makeCloneOperation(cloneTypes[10]);
export const operationCloneDualCarriageway = makeCloneOperation(cloneTypes[11]);
