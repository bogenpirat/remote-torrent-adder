import { ext, sendMessageAndForget } from "./browser-api";
import { type IPlaySoundMessage, PlaySoundMessage } from "../models/messages";

const notificationUrls = new Map<string, string>();

export function registerNotificationClickListener(): void {
    ext.notifications.onClicked.addListener((notificationId) => {
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
        message: message
    };

    void ext.notifications.create("", notificationCreateOptions).then(myId => {
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
            sendMessageAndForget(playSoundMessage);
        });
    }
}

function forgetNotification(notificationId: string): void {
    notificationUrls.delete(notificationId);
    ext.notifications.clear(notificationId).then();
}

async function ensureOffscreenDocument(): Promise<void> {
    if (await ext.offscreen.hasDocument()) return;
    await ext.offscreen.createDocument({
        reasons: ["AUDIO_PLAYBACK"],
        url: 'notifications/offscreen.html',
        justification: "playing a lil audio along with the notification"
    });
}

function openWebUi(url: string): void {
    ext.tabs.create({url: url}).then();
}
