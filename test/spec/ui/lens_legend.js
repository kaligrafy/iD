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
        expect(legend.select('.lens-legend-title').text()).toBe('');
    });

    it('is titled with the name of the active lens', function() {
        render('bundled-access-foot');
        expect(legend.select('.lens-legend-title').text()).not.toBe('');
    });

    it('shows one line per legend entry of the active lens', function() {
        render('bundled-access-foot');
        expect(legend.classed('hide')).toBe(false);
        expect(legend.selectAll('.lens-legend-item').size()).toBe(8);
        expect(legend.selectAll('.lens-legend-swatch-dashed').size()).toBe(0);
    });

    it('marks the dashed entries', function() {
        render('bundled-access-bicycle');
        expect(legend.selectAll('.lens-legend-swatch-dashed').size()).toBe(1);
    });

    it('follows the lens when it changes', function() {
        render('bundled-access-foot');
        prefs(LENS_PREF, 'bundled-maxspeed-colors');
        expect(legend.selectAll('.lens-legend-item').size()).toBe(11);

        prefs(LENS_PREF, 'default');
        expect(legend.classed('hide')).toBe(true);
        expect(legend.selectAll('.lens-legend-item').size()).toBe(0);
    });
});
