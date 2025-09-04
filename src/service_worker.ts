import * as ContextMenu from './util/context-menu';
import { registerAuthenticationListenersForAllWebUis } from './util/authentication-listener';
import { Settings } from './util/settings';
import { RTASettings } from './models/settings';
import { registerMessageListener } from './util/messaging';
import { registerClickActionForIcon } from './util/action';
import { initiateWebUis } from './util/webuis';
import { RegisteredListeners } from './models/messages';
import { clearListeners } from './util/utils';
import { registerCorsCircumventionForWebUis } from './util/cors-tricks';


const listeners = {} as RegisteredListeners;
registerMessageListener();

const settingsProvider = new Settings();
settingsProvider.loadSettings().then(registerEverything);

chrome.storage.local.onChanged.addListener(
    ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
        settingsProvider.loadSettings().then(registerEverything);
    }) as Parameters<typeof chrome.storage.local.onChanged.addListener>[0]
);


async function registerEverything(settings: RTASettings): Promise<void> {
    clearListeners(listeners);

    console.log("Settings loaded:", settings);

    const allWebUis = await initiateWebUis(settings);
    console.log("All WebUIs:", allWebUis);

    registerAuthenticationListenersForAllWebUis(allWebUis);
    registerCorsCircumventionForWebUis(allWebUis);

    listeners.actionIconListener = registerClickActionForIcon(allWebUis.length > 0 ? allWebUis[0] : null);

    ContextMenu.createContextMenu(allWebUis);

    console.debug("Reloaded service worker context", { listeners, settings });
}
