import { ext } from "./browser-api";
import { type NotificationKind } from "../models/notification-kind";
import { getCustomSound } from "./sound-storage";

export async function playNotificationSound(kind: NotificationKind): Promise<void> {
    const objectUrl = await createCustomSoundUrl(kind);
    const freeObjectUrl = () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    };

    const audio = new Audio(objectUrl ?? ext.runtime.getURL(`assets/sounds/${kind}.ogg`));
    audio.addEventListener("ended", freeObjectUrl);
    audio.play().catch(e => {
        freeObjectUrl();
        console.error("Failed to play notification sound", e);
    });
}

async function createCustomSoundUrl(kind: NotificationKind): Promise<string | undefined> {
    try {
        const custom = await getCustomSound(kind);
        return custom ? URL.createObjectURL(custom.blob) : undefined;
    } catch (e) {
        console.error("Failed to load custom sound, using default", e);
        return undefined;
    }
}
