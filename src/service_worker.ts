import * as ContextMenu from './util/context-menu';
import { WebUIFactory } from './models/clients';
import { registerAuthenticationListenersForAllWebUis } from './util/authentication-listener';
import { Settings } from './util/settings';

const settingsProvider = new Settings();
settingsProvider.loadSettings().then((settings) => {
    console.log("Settings loaded:", settings);
    registerAuthenticationListenersForAllWebUis(settings.webuiSettings);
    const allWebUis = settings.webuiSettings.map(webUiSettings => WebUIFactory.createWebUI(webUiSettings)).filter(webUi => webUi !== null);
    ContextMenu.createContextMenu(allWebUis);
});

