import { t } from '../../core/localizer';
import { uiPane } from '../pane';
import { uiSectionEditingPreferences } from '../sections/editing_preferences';
import { uiSectionPrivacy } from '../sections/privacy';
import { uiSectionShortcutList } from '../sections/shortcut_list';

export function uiPanePreferences(context) {

  let preferencesPane = uiPane('preferences', context)
    .key(t('preferences.key'))
    .label(t.append('preferences.title'))
    .description(t.append('preferences.description'))
    .iconName('fas-user-cog')
    .sections([
        uiSectionEditingPreferences(context),
        uiSectionShortcutList(context),
        uiSectionPrivacy(context)
    ]);

  return preferencesPane;
}
