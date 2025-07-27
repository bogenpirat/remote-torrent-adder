import { observe } from './mutations';
import { DiscoveredElement } from './element';
import { RTASettings } from '../models/settings';
import { deserializeSettings } from '../util/serializer';

const discoveredElements: DiscoveredElement[] = [];

chrome.runtime.sendMessage({ "action": "getSettings" }, function (serializedSettings: string) {
    const settings: RTASettings = deserializeSettings(serializedSettings);
    registerLinks(settings.linkCatchingRegexes);
    registerForms(settings.linkCatchingRegexes);
});

function registerLinks(linkRegexes: RegExp[]): void {
    observe('a', (element) => {
        if (element.href && (isMatchedByRegexes(element.href, linkRegexes) || isMagnetLink(element.href))) {
            element.addEventListener('click', (event: MouseEvent) => {
                if (event.ctrlKey || event.shiftKey || event.altKey) {
                    console.log(`Clicked a recognized link, but RTA action prevented due to modifier keys.`);
                    return;
                }

                event.preventDefault();
                console.log('Clicked a regex-matched link');
                // TODO: register actual click event
            });
        }
    });
}

function registerForms(linkRegexes: RegExp[]): void {
    observe('input,button', (element) => {
        const form = element.form;
        if (form && form.action && isMatchedByRegexes(form.action, linkRegexes)) {
            element.addEventListener('click', (event: MouseEvent) => {
                if (event.ctrlKey || event.shiftKey || event.altKey) {
                    console.log("Clicked a recognized link, but RTA action was prevented due to pressed modifier keys.");
                    return;
                }
                event.preventDefault();
                console.log("Clicked custom link");
                discoveredElements.push({
                    element: element,
                    url: element.href
                });
                // TODO: register actual click event
            });
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
    discoveredElements.push({
        element: element,
        url: url
    });
    console.log(`Registered action for element: ${element.tagName}, URL: ${url}`);
}