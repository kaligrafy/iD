import {
    CUSTOM_IMAGERY_USED_NAME_PREF,
    CUSTOM_PRIVATE_URL_PREF
} from '../../renderer/background_source';
import { uiSettingsBackgroundTemplate } from './background_template';


export function uiSettingsCustomBackground() {
    return uiSettingsBackgroundTemplate({
        prefKey: 'background-custom-template',
        stringsKey: 'custom_background',
        privateUrlPrefKey: CUSTOM_PRIVATE_URL_PREF,
        privateNamePrefKey: CUSTOM_IMAGERY_USED_NAME_PREF
    });
}
