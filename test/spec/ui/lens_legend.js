import { select as d3_select, selectAll as d3_selectAll } from 'd3-selection';

import { LENS_PREF } from '../../../modules/core/lenses';
import { prefs } from '../../../modules/core/preferences';
import { uiLensLegend } from '../../../modules/ui/lens_legend';

describe('uiLensLegend', function() {
    let legend;

    function render(lensId) {
        prefs(LENS_PREF, lensId);
        legend = d3_select('body')
            .append('div')
            .attr('class', 'ui-wrap')
            .call(uiLensLegend())
            .select('.lens-legend');
    }

    afterEach(function() {
        d3_selectAll('.ui-wrap').remove();
        prefs(LENS_PREF, null);
    });

    it('is hidden for a lens without a legend', function() {
        render('default');
        expect(legend.classed('hide')).toBe(true);
        expect(legend.selectAll('.lens-legend-item').size()).toBe(0);
    });

    it('shows the name of the active lens and one line per legend entry', function() {
        render('bundled-access-foot');
        expect(legend.classed('hide')).toBe(false);
        expect(legend.selectAll('.lens-legend-lens-name').size()).toBe(1);
        expect(legend.selectAll('.lens-legend-item').size()).toBe(8);
        expect(legend.selectAll('.lens-legend-section-title').size()).toBe(0);
    });

    it('gives a swatch the class of its pattern', function() {
        render('bundled-access-bicycle');
        expect(legend.selectAll('.lens-legend-swatch-error').size()).toBe(1);
    });

    it('shows the titled groups of the Québec lens', function() {
        render('bundled-quebec');
        expect(legend.selectAll('.lens-legend-section').size()).toBe(3);
        expect(legend.selectAll('.lens-legend-section-title').size()).toBe(3);
        expect(legend.selectAll('.lens-legend-swatch-zebra').size()).toBe(1);
        expect(legend.selectAll('.lens-legend-swatch-dotted').size()).toBe(1);
    });

    it('follows the lens when it changes', function() {
        render('bundled-access-foot');
        prefs(LENS_PREF, 'bundled-maxspeed-colors');
        expect(legend.selectAll('.lens-legend-item').size()).toBe(11);

        prefs(LENS_PREF, 'default');
        expect(legend.classed('hide')).toBe(true);
        expect(legend.selectAll('.lens-legend-item').size()).toBe(0);
    });

    it('starts collapsed to its header, expands and collapses with the toggle', function() {
        render('bundled-access-foot');
        const toggle = legend.select('.lens-legend-toggle');
        expect(toggle.attr('aria-expanded')).toBe('false');
        expect(legend.select('.lens-legend-body').classed('hide')).toBe(true);
        expect(legend.classed('hide')).toBe(false);

        toggle.dispatch('click');
        expect(toggle.attr('aria-expanded')).toBe('true');
        expect(legend.select('.lens-legend-body').classed('hide')).toBe(false);

        toggle.dispatch('click');
        expect(toggle.attr('aria-expanded')).toBe('false');
        expect(legend.select('.lens-legend-body').classed('hide')).toBe(true);
    });

    it('collapses again when the lens changes', function() {
        render('bundled-access-foot');
        legend.select('.lens-legend-toggle').dispatch('click');
        prefs(LENS_PREF, 'bundled-maxspeed-colors');
        expect(legend.select('.lens-legend-body').classed('hide')).toBe(true);
    });

    it('saves nothing when toggled', function() {
        render('bundled-access-foot');
        const keysBefore = Object.keys(localStorage).sort();
        legend.select('.lens-legend-toggle').dispatch('click');
        expect(Object.keys(localStorage).sort()).toEqual(keysBefore);
    });
});
