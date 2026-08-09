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
            void rebuildContextMenu();
            void refreshCorsCircumvention();
        }
    }) as Parameters<typeof chrome.storage.local.onChanged.addListener>[0]
);

// Context menus outlive a worker restart but not a browser restart or an
// update, so they are rebuilt on those two events and whenever settings change.
chrome.runtime.onInstalled.addListener(() => {
    void rebuildContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
    clearDynamicRules();
    void rebuildContextMenu();
});

// Session rules are dropped when the browser session ends, so they are cheap to
// recompute and worth re-asserting on every worker start.
void refreshCorsCircumvention();


async function rebuildContextMenu(): Promise<void> {
    try {
        await refreshContextMenu(await loadWebUis());
    } catch (error) {
        console.error("Failed to rebuild the context menu", error);
    }
}

async function refreshCorsCircumvention(): Promise<void> {
    try {
        await registerCorsCircumventionForWebUis(await loadWebUis());
    } catch (error) {
        console.error("Failed to refresh CORS circumvention rules", error);
    }
}
