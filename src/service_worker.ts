import * as ContextMenu from './util/context-menu';
import { WebUIFactory } from './models/clients';
import { registerAuthenticationListenersForAllWebUis } from './util/authentication-listener';
import { Settings } from './util/settings';
import { TorrentWebUI } from './models/webui';
import { RTASettings } from './models/settings';
import { registerCorsCircumventionWithDeclarativeNetRequest } from './util/cors-tricks';
import { registerSettingsMessageSender, registerPreAddTorrentDispatcher, registerAddTorrentDispatcher } from './util/messaging';


const settingsProvider = new Settings();
settingsProvider.loadSettings().then(async (settings) => {
    console.log("Settings loaded:", settings);

    registerSettingsMessageSender(settings);

    const allWebUis = await initiateWebUis(settings);
    console.log("All WebUIs:", allWebUis);

    registerAuthenticationListenersForAllWebUis(allWebUis);
    registerPreAddTorrentDispatcher(allWebUis);
    registerAddTorrentDispatcher(allWebUis);

    ContextMenu.createContextMenu(allWebUis);
});

async function initiateWebUis(settings: RTASettings): Promise<TorrentWebUI[]> {
    const allWebUis = settings.webuiSettings.map(webUiSettings => WebUIFactory.createWebUI(webUiSettings)).filter(webUi => webUi !== null);
    //await registerCorsCircumventionWithDeclarativeNetRequest(allWebUis.map((webUi: TorrentWebUI) => webUi.createBaseUrlPatternForFilter())); // TODO uhm chat do we need this?
    return allWebUis;
}
