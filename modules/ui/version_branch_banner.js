import { select as d3_select } from 'd3-selection';

import { legacyV5EditorPath } from '../../config/id.js';
import { prefs } from '../core/preferences';
import { t } from '../core/localizer';
import { svgIcon } from '../svg/icon';

const DISMISS_PREF = 'transition-v5-banner-dismissed';

/**
 * @returns {boolean} true when the v6 editor is served from the site root (not /v5/).
 */
export function isV6EditorLocation() {
    const path = window.location.pathname;
    return !(/\/v5(?:\/|$)/.test(path));
}

/**
 * Top-of-page notice on the v6 editor with a link to the legacy v5 deployment.
 *
 * @returns {function(import('d3-selection').Selection)} d3 component
 */
export function uiVersionBranchBanner() {
    return function(selection) {
        if (!isV6EditorLocation()) return;
        if (prefs(DISMISS_PREF) === 'true') return;

        const banner = selection
            .append('div')
            .attr('class', 'version-branch-banner fillD');

        banner
            .append('div')
            .attr('class', 'version-branch-banner-text')
            .call(t.append('version_branch_banner.message'));

        const actions = banner
            .append('div')
            .attr('class', 'version-branch-banner-actions');

        actions
            .append('a')
            .attr('class', 'version-branch-banner-link button')
            .attr('href', legacyV5EditorPath)
            .call(t.append('version_branch_banner.open_v5'));

        actions
            .append('button')
            .attr('type', 'button')
            .attr('class', 'version-branch-banner-dismiss button')
            .on('click', function() {
                prefs(DISMISS_PREF, 'true');
                banner.remove();
                d3_select(document.documentElement).classed('version-branch-banner-visible', false);
            })
            .call(t.append('version_branch_banner.dismiss'));

        actions.select('.version-branch-banner-dismiss')
            .call(svgIcon('#iD-icon-close'));

        d3_select(document.documentElement).classed('version-branch-banner-visible', true);
    };
}

/**
 * Footer link to the legacy v5 editor (always shown on v6, including after the banner is dismissed).
 *
 * @returns {function(import('d3-selection').Selection)} d3 component
 */
export function uiLegacyV5FooterLink() {
    return function(selection) {
        if (!isV6EditorLocation()) return;

        selection
            .append('a')
            .attr('href', legacyV5EditorPath)
            .call(t.append('version_branch_banner.footer_link'));
    };
}
