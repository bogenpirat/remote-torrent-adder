import { observe } from './mutations';
import { RTASettings } from '../models/settings';
import { deserializeSettings } from '../util/serializer';
import { GetSettingsMessage, IPreAddTorrentMessage } from '../models/messages';
import { PreAddTorrentMessage } from '../models/messages';


chrome.runtime.sendMessage(GetSettingsMessage, function (serializedSettings: string) {
    const settings: RTASettings = deserializeSettings(serializedSettings);
    registerLinks(settings.linkCatchingRegexes);
    registerForms(settings.linkCatchingRegexes);
});

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

function isMatchedByRegexes(url: string, regexes: RegExp[]): boolean {
    return regexes.some(regex => regex.test(url));
}

function isMagnetLink(url: string): boolean {
    return url.startsWith('magnet:');
}

function registerAction(element: Element, url: string): void {
    console.log(`Registered action for element: ${element.tagName}, URL: ${url}`);
    element.addEventListener('click', (event: MouseEvent) => {
        if (event.ctrlKey || event.shiftKey || event.altKey) {
            console.log("Clicked a recognized link, but RTA action was prevented due to pressed modifier keys.");
            return;
        }
        event.preventDefault();
        console.log("Clicked form input");

        chrome.runtime.sendMessage({ action: PreAddTorrentMessage.action, url: url } as IPreAddTorrentMessage);
    });

}