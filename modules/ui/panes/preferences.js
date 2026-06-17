import { t } from '../../core/localizer';
import { uiPane } from '../pane';
import { uiSectionEditingPreferences } from '../sections/editing_preferences';
import { uiSectionPrivacy } from '../sections/privacy';
import { uiSectionSettingsBackup } from '../sections/settings_backup';
import { uiSectionShortcutList } from '../sections/shortcut_list';
import { uiSectionThemes } from '../sections/themes';

export function uiPanePreferences(context) {

  let preferencesPane = uiPane('preferences', context)
    .key(t('preferences.key'))
    .label(t.append('preferences.title'))
    .description(t.append('preferences.description'))
    .iconName('fas-user-cog')
    .sections([
        uiSectionEditingPreferences(context),
        uiSectionThemes(context),
        uiSectionShortcutList(context),
        uiSectionSettingsBackup(context),
        uiSectionPrivacy(context)
    ]);

  return preferencesPane;
}
