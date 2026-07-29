import { refreshContextMenu, registerContextMenuClickListener } from './util/context-menu';
import { registerAuthenticationListener } from './util/authentication-listener';
import { SETTINGS_KEY } from './util/settings';
import { registerMessageListener } from './util/messaging';
import { registerActionClickListener } from './util/action';
import { loadWebUis } from './util/webuis';
import { clearDynamicRules } from './util/utils';
import { registerCorsCircumventionForWebUis } from './util/cors-tricks';
import { registerNotificationClickListener } from './util/notifications';


registerMessageListener();
registerNotificationClickListener();
registerActionClickListener();
registerContextMenuClickListener();
registerAuthenticationListener();

chrome.storage.local.onChanged.addListener(
    ((changes: Record<string, chrome.storage.StorageChange>) => {
        if (changes[SETTINGS_KEY]) {
            void refreshWebUiDerivedState();
        }
    }) as Parameters<typeof chrome.storage.local.onChanged.addListener>[0]
);

chrome.runtime.onStartup.addListener(() => {
    clearDynamicRules();
    void refreshWebUiDerivedState();
});

void refreshWebUiDerivedState();


async function refreshWebUiDerivedState(): Promise<void> {
    const allWebUis = await loadWebUis();
    refreshContextMenu(allWebUis);
    await registerCorsCircumventionForWebUis(allWebUis);
}
