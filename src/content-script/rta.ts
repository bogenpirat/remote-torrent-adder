import { observe } from './mutations';
import { RTASettings } from '../models/settings';
import { deserializeSettings } from '../util/serializer';
import { GetSettingsMessage, IPreAddTorrentMessage, IUpdateActionBadgeTextMessage, UpdateActionBadgeText } from '../models/messages';
import { PreAddTorrentMessage } from '../models/messages';
import { isMatchedByRegexes } from '../util/utils';


let numFoundLinks: number;
loadSettingsAndRegisterActions();

function loadSettingsAndRegisterActions(attemptNumber: number = 0): void {
    numFoundLinks = 0;
    chrome.runtime.sendMessage({ action: UpdateActionBadgeText.action, text: '' } as IUpdateActionBadgeTextMessage);
    chrome.runtime.sendMessage(GetSettingsMessage, function (serializedSettings: string) {
        const settings: RTASettings = deserializeSettings(serializedSettings);
        console.debug("Received settings from background script:", settings);
        if (!settings && attemptNumber < 3) {
            console.warn("Service worker might've been asleep. Retrying to load settings...");
            loadSettingsAndRegisterActions(attemptNumber + 1);
            return;
        }

        if (settings.linkCatchingEnabled) {
            registerLinks(settings.linkCatchingRegexes);
            registerForms(settings.linkCatchingRegexes);
        }
    });
}

function registerLinks(linkRegexes: RegExp[]): void {
    observe('a', (element) => {
        if (element.href && (isMatchedByRegexes(element.href, linkRegexes) || isMagnetLink(element.href))) {
            registerAction(element, element.href);
        }
    });
}

function registerForms(linkRegexes: RegExp[]): void {
    observe('input,button', (element) => {
        const form = element.form;
        if (form && form.action && (isMatchedByRegexes(form.action, linkRegexes) || isMagnetLink(form.action))) {
            registerAction(element, form.action);
        }
    });
}

function isMagnetLink(url: string): boolean {
    return url && url.startsWith && url.startsWith('magnet:');
}

function incrementCounter(): void {
    chrome.runtime.sendMessage({ action: UpdateActionBadgeText.action, text: (++numFoundLinks).toString() } as IUpdateActionBadgeTextMessage);
}

function registerAction(element: Element, url: string): void {
    incrementCounter();
    console.debug(`Registered action for element: ${element.tagName}, URL: ${url}`);
    element.addEventListener('click', (event: MouseEvent) => {
        if (event.ctrlKey || event.shiftKey || event.altKey) {
            console.log("Clicked a recognized link, but RTA action was prevented due to pressed modifier keys.");
            return;
        }
        event.preventDefault();
        console.debug("Clicked form input");

        chrome.runtime.sendMessage({ action: PreAddTorrentMessage.action, url: url } as IPreAddTorrentMessage);
    });
}