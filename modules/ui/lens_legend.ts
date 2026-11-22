import { localizer, t } from '../core/localizer';
import { prefs } from '../core/preferences';
import { LENS_PREF, getBundledLenses, getSelectedLensId } from '../core/lenses';
import { svgIcon } from '../svg/icon';
import { lensLegend } from '../../config/lens_legends.js';
import type { LensLegendEntry, LensLegendSection } from '../../config/lens_legends.js';

/**
 * Legend of the active lens, drawn over the map. It starts collapsed to its
 * header, "Legend", a button that expands and collapses it. The state is not
 * saved: the legend is collapsed again when the lens changes and when the
 * editor is loaded, so that it only takes room on the map when asked for.
 * Expanded, it shows the name of the lens, then the groups of the legend side
 * by side: an optional group title and one swatch and one label per line. Hidden while
 * the active lens has no legend (config/lens_legends.js).
 *
 * @returns a function that appends the legend to a d3 selection
 */
export function uiLensLegend() {
    return function(selection: d3.Selection<HTMLElement>) {
        let _collapsed = true;

        const legend = selection
            .append('div')
            .attr('class', 'lens-legend fillD2');

        const toggle = legend
            .append('button')
            .attr('class', 'lens-legend-toggle')
            .on('click', () => {
                _collapsed = !_collapsed;
                renderToggle();
            });

        const body = legend
            .append('div')
            .attr('class', 'lens-legend-body');

        function renderToggle() {
            const collapsedIcon = localizer.textDirection() === 'rtl' ? '#iD-icon-backward' : '#iD-icon-forward';
            toggle
                .attr('aria-expanded', String(!_collapsed))
                .text('')
                .call(svgIcon(_collapsed ? collapsedIcon : '#iD-icon-down', 'pre-text'));
            toggle
                .append('span')
                .text(t('map_data.lens.legend.title'));
            body.classed('hide', _collapsed);
        }

        function renderBody() {
            const lensId = getSelectedLensId();
            const sections: LensLegendSection[] = lensLegend(lensId) || [];
            legend.classed('hide', sections.length === 0);
            body.selectAll('*').remove();
            if (sections.length === 0) return;

            // only bundled lenses have a legend, and they all have a translated name
            const lens = getBundledLenses().find((candidate) => candidate.id === lensId);
            if (lens) {
                body
                    .append('div')
                    .attr('class', 'lens-legend-lens-name')
                    .text(t('map_data.lens.bundled.' + lens.nameKey));
            }

            const sectionsEnter = body
                .append('div')
                .attr('class', 'lens-legend-sections')
                .selectAll('.lens-legend-section')
                .data(sections)
                .enter()
                .append('div')
                .attr('class', 'lens-legend-section');

            sectionsEnter
                .filter((section: LensLegendSection) => !!section.titleKey)
                .append('div')
                .attr('class', 'lens-legend-section-title')
                .text((section: LensLegendSection) => t('map_data.lens.legend.' + section.titleKey));

            const items = sectionsEnter.selectAll('.lens-legend-item')
                .data((section: LensLegendSection) => section.entries)
                .enter()
                .append('div')
                .attr('class', 'lens-legend-item');

            items
                .append('span')
                .attr('class', (entry: LensLegendEntry) =>
                    'lens-legend-swatch' + (entry.pattern ? ' lens-legend-swatch-' + entry.pattern : ''))
                .style('--lens-legend-color', (entry: LensLegendEntry) => entry.color);

            items
                .append('span')
                .attr('class', 'lens-legend-label')
                .text((entry: LensLegendEntry) => t('map_data.lens.legend.' + entry.labelKey, entry.labelOptions));
        }

        prefs.onChange(LENS_PREF, () => {
            _collapsed = true;
            renderToggle();
            renderBody();
        });
        renderToggle();
        renderBody();
    };
}
