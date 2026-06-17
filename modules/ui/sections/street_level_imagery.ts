import { t, localizer } from '../../core/localizer';
import { svgIcon } from '../../svg/icon';
import { uiSection } from '../section';
import { uiTooltip } from '../tooltip';
import { uiSettingsCustomStreetLevelImagery } from '../settings/custom_street_level_imagery';
import { getCustomStreetLevelImagery } from '../../core/street_level_imagery';

/**
 * Background-pane section to configure a custom street-level imagery provider
 * (a `{lat}/{lon}/{zoom}` permalink) used by the entity editor location links.
 * @param context The global iD context.
 */
export function uiSectionStreetLevelImagery(context: any) {
    const settings = uiSettingsCustomStreetLevelImagery()
        .on('change', () => section.reRender());

    const section: any = (uiSection('street-level-imagery', context) as any)
        .label(() => t.append('background.street_level_imagery.title'))
        .disclosureContent(render);

    function customLabel(): string {
        const custom = getCustomStreetLevelImagery();
        if (custom && custom.name) return custom.name;
        return t('background.street_level_imagery.custom');
    }

    function render(selection: any) {
        let list = selection.selectAll('ul.layer-list').data([0]);
        list = list.enter()
            .append('ul')
            .attr('class', 'layer-list layer-list-street-level-imagery')
            .merge(list);

        let item = list.selectAll('li.layer-custom').data([0]);
        const itemEnter = item.enter()
            .append('li')
            .attr('class', 'layer-custom');

        itemEnter.append('label').append('span');

        itemEnter.append('button')
            .attr('class', 'layer-browse')
            .call((uiTooltip() as any)
                .title(() => t.append('background.street_level_imagery.tooltip'))
                .placement(localizer.textDirection() === 'rtl' ? 'right' : 'left'))
            .on('click', (d3_event: Event) => {
                d3_event.preventDefault();
                context.container().call(settings);
            })
            .call(svgIcon('#iD-icon-more'));

        item = itemEnter.merge(item);
        item.select('label span').text(customLabel());
    }

    return section;
}
