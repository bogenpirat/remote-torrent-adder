import { ext, sendMessageAndForget } from "./browser-api";
import { type IPlaySoundMessage, PlaySoundMessage } from "../models/messages";
import { canUseOffscreen } from "./platform";
import { playNotificationSound } from "./play-sound";
import { type SoundKind } from "./sound-storage";

export interface NotificationRequest {
    title: string;
    message: string;
    isFailed?: boolean;
    popupDurationMs?: number;
    playSound?: boolean;
    webUiUrl?: string;
}

const DEFAULT_POPUP_DURATION_MS = 2000;

const ICON_URL_BY_KIND: Record<SoundKind, string> = {
    success: "assets/icons/BitTorrent128.png",
    failure: "assets/icons/BitTorrent128-red.png",
};

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

export function showNotification(notification: NotificationRequest): void {
    const { isFailed = true, popupDurationMs = DEFAULT_POPUP_DURATION_MS, playSound = false } = notification;
    const kind: SoundKind = isFailed ? "failure" : "success";

    void ext.notifications.create("", createOptions(notification, kind)).then(notificationId => {
        rememberWebUiUrl(notificationId, notification.webUiUrl);
        setTimeout(() => forgetNotification(notificationId), popupDurationMs);
    });

    if (playSound) {
        playSoundOfKind(kind);
    }
}

function createOptions(notification: NotificationRequest, kind: SoundKind): chrome.notifications.NotificationCreateOptions {
    return {
        type: "basic",
        iconUrl: ICON_URL_BY_KIND[kind],
        title: notification.title,
        message: notification.message
    };
}

function rememberWebUiUrl(notificationId: string, webUiUrl?: string): void {
    if (webUiUrl) {
        notificationUrls.set(notificationId, webUiUrl);
    } else {
        notificationUrls.delete(notificationId);
    }
}

function playSoundOfKind(kind: SoundKind): void {
    if (!canUseOffscreen()) {
        void playNotificationSound(kind);
        return;
    }
    void ensureOffscreenDocument().then(() => {
        const playSoundMessage = {
            action: PlaySoundMessage.action,
            isFailed: kind === "failure"
        } as IPlaySoundMessage;
        sendMessageAndForget(playSoundMessage);
    });
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
