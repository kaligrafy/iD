import { t } from '../core/localizer';
import { prefs } from '../core/preferences';
import { LENS_PREF, getBundledLenses, getSelectedLensId } from '../core/lenses';
import { lensLegend } from '../../config/lens_legends.js';
import type { LensLegendEntry } from '../../config/lens_legends.js';

/**
 * Legend of the active lens, drawn over the map: the name of the lens as a
 * title, then one color swatch and one label per line. Hidden while the active lens has no legend
 * (config/lens_legends.js), and updated when the lens changes.
 *
 * @returns a function that appends the legend to a d3 selection
 */
export function uiLensLegend() {
    return function(selection: d3.Selection<HTMLElement>) {
        const legend = selection
            .append('div')
            .attr('class', 'lens-legend fillD2');

        const title = legend
            .append('div')
            .attr('class', 'lens-legend-title');

        function render() {
            const lensId = getSelectedLensId();
            const entries: LensLegendEntry[] = lensLegend(lensId) || [];
            legend.classed('hide', entries.length === 0);

            // only bundled lenses have a legend, and they all have a translated name
            const lens = getBundledLenses().find((candidate) => candidate.id === lensId);
            title.text(lens && entries.length ? t('map_data.lens.bundled.' + lens.nameKey) : '');
            legend.selectAll('.lens-legend-item').remove();

            const items = legend.selectAll('.lens-legend-item')
                .data(entries)
                .enter()
                .append('div')
                .attr('class', 'lens-legend-item');

            items
                .append('span')
                .attr('class', 'lens-legend-swatch')
                .classed('lens-legend-swatch-dashed', (entry: LensLegendEntry) => !!entry.dashed)
                .style('--lens-legend-color', (entry: LensLegendEntry) => entry.color);

            items
                .append('span')
                .attr('class', 'lens-legend-label')
                .text((entry: LensLegendEntry) => t('map_data.lens.legend.' + entry.labelKey, entry.labelOptions));
        }

        prefs.onChange(LENS_PREF, render);
        render();
    };
}
