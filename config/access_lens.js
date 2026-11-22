/**
 * Access lenses — effective access of a highway for one transport mode, as a
 * colour bucket for CSS. One lens per mode (lenses/access-<mode>.css, written by
 * scripts/build_access_lenses.js from this configuration).
 *
 * Tagging references:
 *   https://wiki.openstreetmap.org/wiki/Key:access
 *   https://wiki.openstreetmap.org/wiki/OSM_tags_for_routing/Access_restrictions
 */

/** Prefix of the secondary key of an access lens; the class is `tag-<prefix><mode>-<bucket>`. */
export const ACCESS_LENS_KEY_PREFIX = 'effective_access_';

/** Bucket of a highway whose access for the mode is not tagged and has no default, or has a value outside ACCESS_LENS_VALUE_BUCKETS. */
export const ACCESS_LENS_OTHER_BUCKET = 'other';

/** Bucket of a highway on which the access of the mode must be tagged and is not (see `untaggedIsMissingOn` in ACCESS_LENS_MODES). */
export const ACCESS_LENS_MISSING_BUCKET = 'missing';

/**
 * Colour of each bucket. Private, customers, permissive, destination and delivery
 * use the colours of the access categories in css/30_highways.css; dismount uses
 * the colour of `bicycle=dismount` in lenses/quebec.css; missing uses the orange
 * of the missing tag highlights in lenses/quebec-validation.css. The other
 * colours were chosen by us.
 * @type {Record<string, string>}
 */
export const ACCESS_LENS_BUCKET_COLORS = {
    yes: 'rgb(46, 184, 46)',
    designated: '#037ffc',
    permissive: '#fcc203',
    customers: 'rgb(255, 136, 0)',
    private: 'rgb(205, 20, 20)',
    no: '#800020',
    dismount: 'rgb(146, 106, 255)',
    destination: 'rgb(255, 55, 188)',
    delivery: 'rgb(63, 214, 156)',
    [ACCESS_LENS_MISSING_BUCKET]: 'rgb(255, 102, 0)',
    [ACCESS_LENS_OTHER_BUCKET]: 'rgb(170, 170, 170)'
};

/**
 * Bucket of each access value, for every mode. A value that is not listed goes
 * to the "other" bucket.
 *   - `use_sidepath`: the way itself is closed to the mode, which uses the path beside it;
 *   - `agricultural` and `forestry`: only for the vehicles of the land owner or operator;
 *   - `discouraged`: allowed but not wanted, like a tolerated use.
 * @type {Record<string, string>}
 */
const ACCESS_LENS_VALUE_BUCKETS = {
    yes: 'yes',
    designated: 'yes',
    permissive: 'permissive',
    discouraged: 'permissive',
    customers: 'customers',
    private: 'private',
    agricultural: 'private',
    forestry: 'private',
    no: 'no',
    use_sidepath: 'no',
    destination: 'destination',
    delivery: 'delivery'
};

/**
 * One access lens per mode.
 *   - `id`: mode id, used in the lens file name and in the CSS class;
 *   - `keys`: access keys that apply to the mode, from the most specific to the
 *     most general (https://wiki.openstreetmap.org/wiki/Key:access#Land-based_transportation);
 *   - `valueBuckets`: buckets of the values that this mode shows differently from
 *     ACCESS_LENS_VALUE_BUCKETS;
 *   - `untaggedIsMissingOn`: `highway=*` values on which the access of the mode
 *     has no usable default and must be tagged; without a tag the highway goes
 *     to the "missing" bucket. Bicycles on a footway may have to ride or to
 *     dismount, and nothing but the tag tells which.
 * @type {{ id: string, keys: string[], valueBuckets: Record<string, string>, untaggedIsMissingOn: string[] }[]}
 */
export const ACCESS_LENS_MODES = [
    { id: 'foot', keys: ['foot', 'access'], valueBuckets: {}, untaggedIsMissingOn: [] },
    { id: 'bicycle', keys: ['bicycle', 'vehicle', 'access'], valueBuckets: { dismount: 'dismount' }, untaggedIsMissingOn: ['footway'] },
    { id: 'motor_vehicle', keys: ['motor_vehicle', 'vehicle', 'access'], valueBuckets: {}, untaggedIsMissingOn: [] },
    { id: 'hgv', keys: ['hgv', 'motor_vehicle', 'vehicle', 'access'], valueBuckets: { designated: 'designated' }, untaggedIsMissingOn: [] },
    { id: 'bus', keys: ['bus', 'psv', 'motor_vehicle', 'vehicle', 'access'], valueBuckets: { designated: 'designated' }, untaggedIsMissingOn: [] }
];

/** Modes that `motorroad=yes` closes when they are not tagged. */
const MOTORROAD_CLOSED_MODES = ['foot', 'bicycle'];

/**
 * Default access by `highway=*` value and access key, when no tag of the way
 * gives the access of a mode.
 *
 * This table is a copy of the `highway` part of `placeholdersByTag` in
 * modules/ui/fields/access.js, limited to the keys the access lenses read. It
 * is copied, not shared, although two tables can drift apart: that file comes
 * from upstream iD, and moving its table out of it would conflict with every
 * upstream change to the access field. When upstream changes its defaults,
 * copy the change here.
 * @type {Record<string, Record<string, string>>}
 */
const HIGHWAY_DEFAULT_ACCESS = {
    footway: { foot: 'designated', motor_vehicle: 'no' },
    steps: { foot: 'yes', motor_vehicle: 'no', bicycle: 'no' },
    ladder: { foot: 'yes', motor_vehicle: 'no', bicycle: 'no' },
    pedestrian: { foot: 'yes', motor_vehicle: 'no' },
    living_street: { foot: 'yes' },
    cycleway: { motor_vehicle: 'no', bicycle: 'designated' },
    bridleway: { motor_vehicle: 'no' },
    path: { foot: 'yes', motor_vehicle: 'no', bicycle: 'yes' },
    motorway: { foot: 'no', motor_vehicle: 'yes', bicycle: 'no' },
    trunk: { motor_vehicle: 'yes' },
    primary: { foot: 'yes', motor_vehicle: 'yes', bicycle: 'yes' },
    secondary: { foot: 'yes', motor_vehicle: 'yes', bicycle: 'yes' },
    tertiary: { foot: 'yes', motor_vehicle: 'yes', bicycle: 'yes' },
    residential: { foot: 'yes', motor_vehicle: 'yes', bicycle: 'yes' },
    unclassified: { foot: 'yes', motor_vehicle: 'yes', bicycle: 'yes' },
    service: { foot: 'yes', motor_vehicle: 'yes', bicycle: 'yes' },
    motorway_link: { foot: 'no', motor_vehicle: 'yes', bicycle: 'no' },
    trunk_link: { motor_vehicle: 'yes' },
    primary_link: { foot: 'yes', motor_vehicle: 'yes', bicycle: 'yes' },
    secondary_link: { foot: 'yes', motor_vehicle: 'yes', bicycle: 'yes' },
    tertiary_link: { foot: 'yes', motor_vehicle: 'yes', bicycle: 'yes' },
    construction: { access: 'no' },
    busway: { access: 'no', bus: 'designated' }
};

/**
 * Access value of a highway for a mode: the most specific tag of the mode, else
 * the value implied by `motorroad=yes`, else the default of the `highway=*` value.
 * @param {Record<string, string>} tags - tags of a highway
 * @param {{ id: string, keys: string[] }} mode - one of ACCESS_LENS_MODES
 * @returns {string|undefined} the access value, `undefined` when nothing gives it
 */
function effectiveAccessValue(tags, mode) {
    const [modeKey, ...inheritedKeys] = mode.keys;
    if (tags[modeKey]) return tags[modeKey];
    if (tags.motorroad === 'yes' && MOTORROAD_CLOSED_MODES.includes(mode.id)) return 'no';

    const inheritedKey = inheritedKeys.find((key) => tags[key]);
    if (inheritedKey) return tags[inheritedKey];

    const defaults = HIGHWAY_DEFAULT_ACCESS[tags.highway] || {};
    const defaultKey = mode.keys.find((key) => defaults[key]);
    return defaultKey && defaults[defaultKey];
}

/**
 * Colour bucket of a highway in the access lens of a mode.
 * @param {Record<string, string>} tags - tags of the feature
 * @param {string} modeId - `id` of one of ACCESS_LENS_MODES
 * @returns {string|undefined} a key of ACCESS_LENS_BUCKET_COLORS, or `undefined`
 * when the feature is not a highway or the mode is unknown
 */
export function accessLensBucket(tags, modeId) {
    const mode = ACCESS_LENS_MODES.find((candidate) => candidate.id === modeId);
    if (!mode || !tags.highway) return undefined;

    const value = effectiveAccessValue(tags, mode);
    if (!value && mode.untaggedIsMissingOn.includes(tags.highway)) return ACCESS_LENS_MISSING_BUCKET;
    return mode.valueBuckets[value] || ACCESS_LENS_VALUE_BUCKETS[value] || ACCESS_LENS_OTHER_BUCKET;
}

/**
 * Buckets a mode can show, in the order of ACCESS_LENS_BUCKET_COLORS.
 * @param {string} modeId - `id` of one of ACCESS_LENS_MODES
 * @returns {string[]} keys of ACCESS_LENS_BUCKET_COLORS; empty when the mode is unknown
 */
export function accessLensBuckets(modeId) {
    const mode = ACCESS_LENS_MODES.find((candidate) => candidate.id === modeId);
    if (!mode) return [];

    const shown = new Set([
        ...Object.values(ACCESS_LENS_VALUE_BUCKETS),
        ...Object.values(mode.valueBuckets),
        ACCESS_LENS_OTHER_BUCKET
    ]);
    if (mode.untaggedIsMissingOn.length) shown.add(ACCESS_LENS_MISSING_BUCKET);
    return Object.keys(ACCESS_LENS_BUCKET_COLORS).filter((bucket) => shown.has(bucket));
}

/**
 * @param {string} modeId - `id` of one of ACCESS_LENS_MODES
 * @returns {string} id of the bundled access lens of the mode
 */
export function accessLensId(modeId) {
    return 'bundled-access-' + modeId.replace(/_/g, '-');
}
