import { geoPath as d3_geoPath } from 'd3-geo';

import { t } from '../../core/localizer';
import { prefs } from '../../core/preferences';
import { svgIcon } from '../../svg/icon';
import { uiSection } from '../section';
import {
    STREET_LEVEL_CUSTOM_NAME_PREF,
    STREET_LEVEL_CUSTOM_URL_PREF,
    listStreetLevelImagery
} from '../../core/street_level_imagery';

/** Map zoom level used in street-level imagery permalinks. */
const IMAGERY_ZOOM = 18;

/** A copyable value shown as one row (an id or a coordinate format). */
interface CopyableRow {
    id: string;
    value: string;
}

/**
 * Build the copyable long (`way/1234`) and short (`w/1234`) id of an entity.
 * @param entity A saved OSM entity (not new - `entity.isNew()` is `false`).
 * @returns Ordered list of `{ id, value }` formats.
 */
export function formatOsmIds(entity: any): CopyableRow[] {
    const osmId = entity.osmId();
    return [
        { id: 'id_long', value: `${entity.type}/${osmId}` },
        { id: 'id_short', value: `${entity.type[0]}/${osmId}` }
    ];
}

/**
 * Build the copyable coordinate strings for a location, mirroring the legacy
 * v5 formats: `lat,lon`, `[lon,lat]` and (when a stable OSM id exists)
 * `osmId,lat,lon`.
 * @param loc A location as `[lon, lat]` (iD convention) - a node's own
 *   location, or another entity's centroid.
 * @param osmId Numeric OSM id of the entity, or `null` if it's unsaved.
 * @returns Ordered list of `{ id, value }` formats.
 */
export function formatCoordinates(loc: [number, number], osmId: number | null): CopyableRow[] {
    const [lon, lat] = loc;
    const formats: CopyableRow[] = [
        { id: 'latlon', value: `${lat},${lon}` },
        { id: 'lonlat', value: `[${lon},${lat}]` }
    ];
    // a brand-new entity only has a temporary negative id, which is not useful
    if (osmId !== null) {
        formats.push({ id: 'id_latlon', value: `${osmId},${lat},${lon}` });
    }
    return formats;
}

/**
 * Fill an imagery URL template, replacing the `{lat}`, `{lon}` and `{zoom}`
 * placeholders.
 * @param template URL template, e.g. `https://.../?map={zoom}/{lat}/{lon}`.
 * @param loc Location as `[lon, lat]` (iD convention).
 * @param zoom Map zoom level to embed in the permalink.
 * @returns The resolved URL.
 */
export function fillImageryUrl(template: string, loc: [number, number], zoom: number): string {
    const [lon, lat] = loc;
    return template
        .replaceAll('{lat}', String(lat))
        .replaceAll('{lon}', String(lon))
        .replaceAll('{zoom}', String(zoom));
}

/**
 * The location to use for street-level imagery links and copyable
 * coordinates: a node's own location, or another entity's centroid (properly
 * accounting for multipolygon holes via the projected path centroid, the same
 * way the measurement panel computes it), falling back to the bounding box
 * center if the projected centroid is degenerate.
 * @param context The global iD context.
 * @param entity Any single selected entity.
 * @returns A `[lon, lat]` location, or `null` if none could be computed
 *   (e.g. an entity with no geometry yet).
 */
export function representativeLoc(context: any, entity: any): [number, number] | null {
    if (entity.type === 'node') return entity.loc;

    const graph = context.graph();
    let centroid = d3_geoPath(context.projection).centroid(entity.asGeoJSON(graph));
    centroid = centroid && context.projection.invert(centroid);
    if (!centroid || !isFinite(centroid[0]) || !isFinite(centroid[1])) {
        centroid = entity.extent(graph).center();
    }
    return (centroid && isFinite(centroid[0]) && isFinite(centroid[1])) ? centroid : null;
}

/**
 * Entity editor section shown below Relations for a single selected entity:
 * its copyable OSM id, street-level imagery links (Panoramax, Mapillary) and
 * copyable coordinates. For entities other than nodes, the coordinates and
 * imagery links use the entity's centroid.
 * @param context The global iD context.
 */
export function uiSectionLocationLinks(context: any) {
    let _entityIDs: string[] = [];

    const section: any = (uiSection('location-links', context) as any)
        .shouldDisplay(() => selectedLoc() !== null)
        .label(() => t.append('inspector.location_links.title'))
        .disclosureContent(render);

    // A single selected entity (saved or not) with a computable location.
    function selectedEntity() {
        if (_entityIDs.length !== 1) return null;
        return context.hasEntity(_entityIDs[0]) || null;
    }

    function selectedLoc() {
        const entity = selectedEntity();
        return entity ? representativeLoc(context, entity) : null;
    }

    function render(selection: any) {
        const entity = selectedEntity();
        const loc = entity && representativeLoc(context, entity);
        if (!entity || !loc) return;

        let container = selection.selectAll('.location-links-container').data([0]);
        const containerEnter = container.enter()
            .append('div')
            .attr('class', 'location-links-container');
        containerEnter.append('div').attr('class', 'street-level-imagery-links');
        containerEnter.append('ul').attr('class', 'location-coordinates');
        container = containerEnter.merge(container);

        // a brand-new entity only has a temporary negative id, which is not useful
        const osmId = entity.isNew() ? null : entity.osmId();
        const rows = (osmId !== null ? formatOsmIds(entity) : []).concat(formatCoordinates(loc, osmId));

        renderImageryLinks(container.select('.street-level-imagery-links'), loc);
        renderCopyableRows(container.select('.location-coordinates'), rows);
    }

    function renderImageryLinks(selection: any, loc: [number, number]) {
        const links = selection.selectAll('a.street-level-imagery-link')
            .data(listStreetLevelImagery(), (d: any) => d.id);
        links.exit().remove();

        const linksEnter = links.enter()
            .append('a')
            .attr('class', 'street-level-imagery-link')
            .attr('target', '_blank')
            .attr('rel', 'noopener')
            .call(svgIcon('#iD-icon-out-link', 'inline'));
        linksEnter.append('span');

        linksEnter.merge(links)
            .attr('href', (d: any) => fillImageryUrl(d.url, loc, IMAGERY_ZOOM))
            .select('span')
            .text((d: any) => d.name || t('inspector.location_links.custom'));
    }

    function renderCopyableRows(selection: any, rows: CopyableRow[]) {
        const items = selection.selectAll('li.location-coordinate')
            .data(rows, (d: CopyableRow) => d.id);
        items.exit().remove();

        const itemsEnter = items.enter()
            .append('li')
            .attr('class', 'location-coordinate');
        itemsEnter.append('span').attr('class', 'location-coordinate-value');
        itemsEnter.append('button')
            .attr('class', 'form-field-button location-coordinate-copy')
            .attr('title', t('icons.copy'))
            .call(svgIcon('#iD-operation-copy'))
            .on('click', (d3_event: Event, d: CopyableRow) => {
                d3_event.preventDefault();
                navigator.clipboard?.writeText(d.value);
            });

        itemsEnter.merge(items)
            .select('.location-coordinate-value')
            .text((d: CopyableRow) => d.value);
    }

    section.entityIDs = function(val: string[]) {
        _entityIDs = val || [];
        return section;
    };

    // refresh imagery links when the custom street-level provider changes
    prefs.onChange(STREET_LEVEL_CUSTOM_URL_PREF, section.reRender);
    prefs.onChange(STREET_LEVEL_CUSTOM_NAME_PREF, section.reRender);

    return section;
}
