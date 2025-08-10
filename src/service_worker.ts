import * as ContextMenu from './util/context-menu';
import { WebUIFactory } from './models/clients';
import { registerAuthenticationListenersForAllWebUis } from './util/authentication-listener';
import { Settings } from './util/settings';
import { TorrentWebUI } from './models/webui';
import { RTASettings } from './models/settings';
import { registerCorsCircumventionWithDeclarativeNetRequest } from './util/cors-tricks';
import { registerMessageListener } from './util/messaging';
import { registerClickActionForIcon } from './util/action';


const settingsProvider = new Settings();
settingsProvider.loadSettings().then(registerEverything);


async function registerEverything(settings: RTASettings): Promise<void> {
    console.log("Settings loaded:", settings);

    const allWebUis = await initiateWebUis(settings);
    console.log("All WebUIs:", allWebUis);

    registerMessageListener(allWebUis, settingsProvider);

    registerAuthenticationListenersForAllWebUis(allWebUis);

    registerClickActionForIcon(allWebUis.length > 0 ? allWebUis[0] : null);

    ContextMenu.createContextMenu(allWebUis);
}

async function initiateWebUis(settings: RTASettings): Promise<TorrentWebUI[]> {
    const allWebUis = settings.webuiSettings.map(webUiSettings => WebUIFactory.createWebUI(webUiSettings)).filter(webUi => webUi !== null);
    //await registerCorsCircumventionWithDeclarativeNetRequest(allWebUis.map((webUi: TorrentWebUI) => webUi.createBaseUrlPatternForFilter())); // TODO uhm chat do we need this?
    return allWebUis;
}
