import { IPlaySoundMessage, PlaySoundMessage } from "../models/messages";

const notificationUrls = new Map<string, string>();

export function registerNotificationClickListener(): void {
    chrome.notifications.onClicked.addListener((notificationId) => {
        const url = notificationUrls.get(notificationId);
        if (url) {
            openWebUi(url);
            forgetNotification(notificationId);
        }
    });
}

export function showNotification(title: string, message: string, isFailed: boolean = true, popupDurationMs: number = 2000, playSound: boolean = false, webUiUrl?: string): void {
    const notificationCreateOptions: chrome.notifications.NotificationCreateOptions = {
        type: "basic",
        iconUrl: isFailed ? "assets/icons/BitTorrent128-red.png" : "assets/icons/BitTorrent128.png",
        title: title,
        priority: 0,
        message: message
    };

    chrome.notifications.create("", notificationCreateOptions, myId => {
        if (webUiUrl) {
            notificationUrls.set(myId, webUiUrl);
        } else {
            notificationUrls.delete(myId);
        }

        setTimeout(() => forgetNotification(myId), popupDurationMs);
    });

    if (playSound) {
        ensureOffscreenDocument().then(() => {
            const playSoundMessage = {
                action: PlaySoundMessage.action,
                isFailed
            } as IPlaySoundMessage;
            chrome.runtime.sendMessage(playSoundMessage).then();
        });
    }
}

function forgetNotification(notificationId: string): void {
    notificationUrls.delete(notificationId);
    chrome.notifications.clear(notificationId);
}

async function ensureOffscreenDocument(): Promise<void> {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        reasons: ["AUDIO_PLAYBACK"],
        url: 'notifications/offscreen.html',
        justification: "playing a lil audio along with the notification"
    });
}

function openWebUi(url: string): void {
    chrome.tabs.create({ url: url });
}
