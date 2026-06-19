import { IPlaySoundMessage, PlaySoundMessage } from "../models/messages";
import { hasOffscreenApi } from "./browser-compat";

export function showNotification(title: string, message: string, isFailed: boolean = true, popupDurationMs: number = 2000, playSound: boolean = false, webUiurl?: string): void {
    var notificationCreateOptions: chrome.notifications.NotificationCreateOptions = {
        type: "basic",
        iconUrl: (isFailed === true) ? "assets/icons/BitTorrent128-red.png" : "assets/icons/BitTorrent128.png",
        title: title,
        priority: 0,
        message: message
    };

    chrome.notifications.create("", notificationCreateOptions, myId => {
        if (webUiurl) {
            chrome.notifications.onClicked.addListener((clickedNotificationId) => {
                if (clickedNotificationId === myId) {
                    openWebUi(webUiurl);
                }
            });
        }

        setTimeout(function () {
            chrome.notifications.clear(myId, (wasCleared) => { });
        }, popupDurationMs);
    });

    if (playSound) {
        const soundFile = isFailed ? 'assets/sounds/failure.ogg' : 'assets/sounds/success.ogg';
        playNotificationSound(soundFile);
    }
}

async function playNotificationSound(soundFile: string): Promise<void> {
    if (hasOffscreenApi()) {
        // Chromium: the service worker has no DOM, so audio is played from an
        // offscreen document. The path is relative to notifications/offscreen.html.
        await ensureOffscreenDocument();
        const playSoundMessage = {
            action: PlaySoundMessage.action,
            source: `../${soundFile}`,
            volume: 1
        } as IPlaySoundMessage;
        chrome.runtime.sendMessage(playSoundMessage);
    } else {
        // Firefox: the MV3 background runs as a DOM-capable event page, so the
        // sound can be played directly without an offscreen document.
        try {
            await new Audio(chrome.runtime.getURL(soundFile)).play();
        } catch (error) {
            console.error("Failed to play notification sound", error);
        }
    }
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