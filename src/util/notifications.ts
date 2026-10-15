import { ext, sendMessageAndForget } from "./browser-api";
import { type IPlaySoundMessage, PlaySoundMessage } from "../models/messages";
import { canUseOffscreen } from "./platform";
import { playNotificationSound } from "./play-sound";
import { type NotificationKind } from "../models/notification-kind";

export interface NotificationRequest {
    title: string;
    message: string;
    kind: NotificationKind;
    popupDurationMs?: number;
    playSound?: boolean;
    clickUrl?: string;
}

const DEFAULT_POPUP_DURATION_MS = 2000;

const ICON_URL_BY_KIND: Record<NotificationKind, string> = {
    success: "assets/icons/BitTorrent128.png",
    failure: "assets/icons/BitTorrent128-red.png",
};

const notificationUrls = new Map<string, string>();

export function registerNotificationClickListener(): void {
    ext.notifications.onClicked.addListener((notificationId) => {
        const url = notificationUrls.get(notificationId);
        if (url) {
            openInNewTab(url);
            forgetNotification(notificationId);
        }
    });
}

export function showNotification(notification: NotificationRequest): void {
    const { kind, popupDurationMs = DEFAULT_POPUP_DURATION_MS, playSound = false } = notification;

    ext.notifications.create("", createNotificationOptions(notification)).then(notificationId => {
        rememberClickUrl(notificationId, notification.clickUrl);
        setTimeout(() => forgetNotification(notificationId), popupDurationMs);
    }).catch(error => console.error(`Failed showing the ${kind} notification "${notification.title}":`, error));

    if (playSound) {
        playSoundOfKind(kind);
    }
}

type NotificationCreateOptions = chrome.notifications.NotificationCreateOptions;

function createNotificationOptions(notification: NotificationRequest): NotificationCreateOptions {
    return {
        type: "basic",
        iconUrl: ICON_URL_BY_KIND[notification.kind],
        title: notification.title,
        message: notification.message
    };
}

function rememberClickUrl(notificationId: string, clickUrl?: string): void {
    if (clickUrl) {
        notificationUrls.set(notificationId, clickUrl);
    } else {
        notificationUrls.delete(notificationId);
    }
}

function playSoundOfKind(kind: NotificationKind): void {
    if (!canUseOffscreen()) {
        void playNotificationSound(kind);
        return;
    }
    ensureOffscreenDocument().then(() => {
        const playSoundMessage = {
            action: PlaySoundMessage.action,
            kind
        } as IPlaySoundMessage;
        sendMessageAndForget(playSoundMessage);
    }).catch(error => console.error(`Failed playing the ${kind} notification sound:`, error));
}

function forgetNotification(notificationId: string): void {
    notificationUrls.delete(notificationId);
    ext.notifications.clear(notificationId)
        .catch(error => console.error(`Failed clearing notification ${notificationId}:`, error));
}

async function ensureOffscreenDocument(): Promise<void> {
    if (await ext.offscreen.hasDocument()) return;
    await ext.offscreen.createDocument({
        reasons: ["AUDIO_PLAYBACK"],
        url: 'notifications/offscreen.html',
        justification: "playing a lil audio along with the notification"
    });
}

function openInNewTab(url: string): void {
    ext.tabs.create({ url })
        .catch(error => console.error(`Failed opening ${url} from a notification:`, error));
}
