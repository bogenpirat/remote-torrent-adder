import { observe } from './mutations';
import { deriveLinkLabel, isMagnetLink } from './link-labels';
import {deserializeObject} from '../util/serializer';
import {
    GetLinkCatchingConfig,
    GetPageLinksMessage,
    type ILinkCatchingConfig,
    type IPageLinkInfo,
    type IPageLinksResponse,
    type IPreAddTorrentMessage,
    type IUpdateActionBadgeTextMessage,
    UpdateActionBadgeText
} from '../models/messages';
import { PreAddTorrentMessage } from '../models/messages';
import { isMatchedByRegexes } from '../util/utils';


let numFoundLinks: number;
let foundLinks: IPageLinkInfo[];
let seenLinkUrls: Set<string>;
loadSettingsAndRegisterActions();

chrome.runtime.onMessage.addListener((message: { action?: string }, _sender, sendResponse: (response: IPageLinksResponse) => void) => {
    if (message?.action === GetPageLinksMessage.action) {
        sendResponse({ links: foundLinks });
        return false;
    }
    return false;
});

function loadSettingsAndRegisterActions(attemptNumber: number = 0): void {
    numFoundLinks = 0;
    foundLinks = [];
    seenLinkUrls = new Set<string>();
    chrome.runtime.sendMessage({ action: UpdateActionBadgeText.action, text: '' } as IUpdateActionBadgeTextMessage);
    chrome.runtime.sendMessage(GetLinkCatchingConfig, function (serializedConfig?: string) {
        if (chrome.runtime.lastError || !serializedConfig) {
            if (attemptNumber < 3) {
                console.warn("Service worker might've been asleep. Retrying to load config...");
                setTimeout(() => loadSettingsAndRegisterActions(attemptNumber + 1), 100 * (attemptNumber + 1));
            }
            return;
        }

        const config = deserializeObject(serializedConfig) as ILinkCatchingConfig;
        console.debug("Received link-catching config from background script:", config);

        if (config.linkCatchingEnabled) {
            registerLinks(config.linkCatchingRegexes);
            registerForms(config.linkCatchingRegexes);
        }
    });
}

function registerLinks(linkRegexes: RegExp[]): void {
    observe<HTMLAnchorElement>('a', (element) => {
        if (element.href && (isMatchedByRegexes(element.href, linkRegexes) || isMagnetLink(element.href))) {
            registerAction(element, element.href);
        }
    });
}

function registerForms(linkRegexes: RegExp[]): void {
    observe<HTMLInputElement | HTMLButtonElement>('input,button', (element) => {
        const form = element.form;
        if (form && form.action && (isMatchedByRegexes(form.action, linkRegexes) || isMagnetLink(form.action))) {
            registerAction(element, form.action);
        }
    });
}

function incrementCounter(): void {
    chrome.runtime.sendMessage({
        action: UpdateActionBadgeText.action,
        text: (++numFoundLinks).toString()
    } as IUpdateActionBadgeTextMessage).then();
}

function recordFoundLink(element: Element, url: string): void {
    if (seenLinkUrls.has(url)) {
        return;
    }
    seenLinkUrls.add(url);
    foundLinks.push({ url, label: deriveLinkLabel(element, url) });
}

function registerAction(element: Element, url: string): void {
    incrementCounter();
    recordFoundLink(element, url);
    console.debug(`Registered action for element: ${element.tagName}, URL: ${url}`);
    element.addEventListener('click', (event: Event) => {
        const mouseEvent = event as MouseEvent;
        if (mouseEvent.ctrlKey || mouseEvent.shiftKey || mouseEvent.altKey) {
            console.log("Clicked a recognized link, but RTA action was prevented due to pressed modifier keys.");
            return;
        }
        mouseEvent.preventDefault();
        console.debug("Clicked form input");

        chrome.runtime.sendMessage({ action: PreAddTorrentMessage.action, url: url } as IPreAddTorrentMessage);
    });
}
