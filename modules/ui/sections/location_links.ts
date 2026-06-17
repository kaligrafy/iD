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

/** A copyable coordinate representation of a node. */
interface CoordinateFormat {
    id: string;
    value: string;
}

/**
 * Build the copyable coordinate strings for a node, mirroring the legacy v5
 * formats: `lat,lon`, `[lon,lat]` and `osmId,lat,lon`.
 * @param loc Node location as `[lon, lat]` (iD convention).
 * @param osmId Numeric OSM id of the node.
 * @returns Ordered list of `{ id, value }` formats.
 */
export function formatCoordinates(loc: [number, number], osmId: number): CoordinateFormat[] {
    const [lon, lat] = loc;
    return [
        { id: 'latlon', value: `${lat},${lon}` },
        { id: 'lonlat', value: `[${lon},${lat}]` },
        { id: 'id_latlon', value: `${osmId},${lat},${lon}` }
    ];
}

/**
 * Fill an imagery URL template, replacing the `{lat}`, `{lon}` and `{zoom}`
 * placeholders.
 * @param template URL template, e.g. `https://.../?map={zoom}/{lat}/{lon}`.
 * @param loc Node location as `[lon, lat]` (iD convention).
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
 * Entity editor section shown below the tag form for a single existing node:
 * street-level imagery links (Panoramax, Mapillary) and copyable coordinates.
 * @param context The global iD context.
 */
export function uiSectionLocationLinks(context: any) {
    let _entityIDs: string[] = [];

    const section: any = (uiSection('location-links', context) as any)
        .shouldDisplay(() => selectedNode() !== null)
        .label(() => t.append('inspector.location_links.title'))
        .disclosureContent(render);

    // Only a single, already-uploaded node has a stable location and OSM id.
    function selectedNode() {
        if (_entityIDs.length !== 1) return null;
        const entity = context.hasEntity(_entityIDs[0]);
        return (entity && entity.type === 'node' && !entity.isNew()) ? entity : null;
    }

    function render(selection: any) {
        const node = selectedNode();
        if (!node) return;

        const loc = node.loc as [number, number];

        let container = selection.selectAll('.location-links-container').data([0]);
        const containerEnter = container.enter()
            .append('div')
            .attr('class', 'location-links-container');
        containerEnter.append('div').attr('class', 'street-level-imagery-links');
        containerEnter.append('ul').attr('class', 'location-coordinates');
        container = containerEnter.merge(container);

        renderImageryLinks(container.select('.street-level-imagery-links'), loc);
        renderCoordinates(container.select('.location-coordinates'), loc, node.osmId());
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

    function renderCoordinates(selection: any, loc: [number, number], osmId: number) {
        const rows = selection.selectAll('li.location-coordinate')
            .data(formatCoordinates(loc, osmId), (d: CoordinateFormat) => d.id);
        rows.exit().remove();

        const rowsEnter = rows.enter()
            .append('li')
            .attr('class', 'location-coordinate');
        rowsEnter.append('span').attr('class', 'location-coordinate-value');
        rowsEnter.append('button')
            .attr('class', 'form-field-button location-coordinate-copy')
            .attr('title', t('icons.copy'))
            .call(svgIcon('#iD-operation-copy'))
            .on('click', (d3_event: Event, d: CoordinateFormat) => {
                d3_event.preventDefault();
                navigator.clipboard?.writeText(d.value);
            });

        rowsEnter.merge(rows)
            .select('.location-coordinate-value')
            .text((d: CoordinateFormat) => d.value);
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
