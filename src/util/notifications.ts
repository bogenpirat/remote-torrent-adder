import { IPlaySoundMessage, PlaySoundMessage } from "../models/messages";

export function showNotification(title: string, message: string, isFailed: boolean = true, popupDurationMs: number = 2000, playSound: boolean = false, webUiurl?: string): void {
    var notificationCreateOptions: chrome.notifications.NotificationCreateOptions = {
        type: "basic",
        iconUrl: (isFailed === true) ? "assets/icons/BitTorrent128-red.png" : "assets/icons/BitTorrent128.png",
        title: title,
        priority: 0,
        message: message
    };

    chrome.notifications.create(null, notificationCreateOptions, myId => {
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
        playAudioNotification(isFailed).then(() => {
            const playSoundMessage = {
                action: PlaySoundMessage.action,
                source: isFailed ? '../assets/sounds/failure.ogg' : '../assets/sounds/success.ogg',
                volume: 1
            } as IPlaySoundMessage;
            chrome.runtime.sendMessage(playSoundMessage);
        });
    }
}

async function playAudioNotification(isFailed: boolean): Promise<void> {
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