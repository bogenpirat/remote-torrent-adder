import * as ContextMenu from './util/context-menu';
import { registerAuthenticationListenersForAllWebUis } from './util/authentication-listener';
import { Settings } from './util/settings';
import { RTASettings } from './models/settings';
import { registerCorsCircumventionWithDeclarativeNetRequest } from './util/cors-tricks';
import { registerMessageListener } from './util/messaging';
import { registerClickActionForIcon } from './util/action';
import { initiateWebUis } from './util/webuis';


const settingsProvider = new Settings();
settingsProvider.loadSettings().then(registerEverything);


async function registerEverything(settings: RTASettings): Promise<void> {
    console.log("Settings loaded:", settings);

    const allWebUis = await initiateWebUis(settings);
    console.log("All WebUIs:", allWebUis);

    registerMessageListener(settingsProvider);

    registerAuthenticationListenersForAllWebUis(allWebUis);

    registerClickActionForIcon(allWebUis.length > 0 ? allWebUis[0] : null);

    ContextMenu.createContextMenu(allWebUis);
}
