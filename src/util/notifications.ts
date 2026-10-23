import { ext, sendMessageAndForget } from "./browser-api";
import { type IPlaySoundMessage, PlaySoundMessage } from "../models/messages";
import { canUseOffscreen, isFirefox } from "./platform";
import { playNotificationSound } from "./play-sound";
import { openSetLabelWindow } from "./action";

const notificationUrls = new Map<string, string>();
const LABEL_ACTION_KEY_PREFIX = "notificationLabelAction:";

export interface NotificationLabelAction {
    webUiId: string;
    infoHash: string;
    torrentName: string;
}

export function registerNotificationClickListener(): void {
    ext.notifications.onClicked.addListener((notificationId) => {
        const url = notificationUrls.get(notificationId);
        if (url) {
            openWebUi(url);
            forgetNotification(notificationId);
        }
    });
}

export function registerNotificationButtonListener(): void {
    ext.notifications.onButtonClicked?.addListener((notificationId) => {
        void openSetLabelWindowFor(notificationId);
    });
}

export function showNotification(title: string, message: string, isFailed: boolean = true, popupDurationMs: number = 2000, playSound: boolean = false, webUiUrl?: string, labelAction?: NotificationLabelAction): void {
    const notificationCreateOptions: chrome.notifications.NotificationCreateOptions = {
        type: "basic",
        iconUrl: isFailed ? "assets/icons/BitTorrent128-red.png" : "assets/icons/BitTorrent128.png",
        title: title,
        message: message
    };
    const offeredLabelAction = isFirefox() ? undefined : labelAction;
    if (offeredLabelAction) {
        notificationCreateOptions.buttons = [{ title: "Add label" }];
    }

    void ext.notifications.create("", notificationCreateOptions).then(async myId => {
        if (webUiUrl) {
            notificationUrls.set(myId, webUiUrl);
        } else {
            notificationUrls.delete(myId);
        }
        if (offeredLabelAction) {
            await ext.storage.session.set({ [LABEL_ACTION_KEY_PREFIX + myId]: offeredLabelAction });
        }

        setTimeout(() => forgetNotification(myId), popupDurationMs);
    });

    if (playSound) {
        if (canUseOffscreen()) {
            void ensureOffscreenDocument().then(() => {
                const playSoundMessage = {
                    action: PlaySoundMessage.action,
                    isFailed
                } as IPlaySoundMessage;
                sendMessageAndForget(playSoundMessage);
            });
        } else {
            void playNotificationSound(isFailed);
        }
    }
}

async function openSetLabelWindowFor(notificationId: string): Promise<void> {
    const key = LABEL_ACTION_KEY_PREFIX + notificationId;
    const labelAction = (await ext.storage.session.get(key))[key] as NotificationLabelAction | undefined;
    if (labelAction) {
        openSetLabelWindow({ ...labelAction });
        forgetNotification(notificationId);
    }
}

function forgetNotification(notificationId: string): void {
    notificationUrls.delete(notificationId);
    ext.notifications.clear(notificationId).then();
    void ext.storage.session.remove(LABEL_ACTION_KEY_PREFIX + notificationId);
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
