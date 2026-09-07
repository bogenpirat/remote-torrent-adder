import { ext } from "./browser-api";
import { getCustomSound, type SoundKind } from "./sound-storage";

// Play the user's custom sound for this outcome if one is stored, otherwise
// fall back to the bundled default. Needs a DOM (Audio, URL.createObjectURL),
// so it runs in Chrome's offscreen document and in Firefox's event page.
export async function playNotificationSound(isFailed: boolean): Promise<void> {
    const kind: SoundKind = isFailed ? "failure" : "success";

    let source = ext.runtime.getURL(`assets/sounds/${kind}.ogg`);
    let objectUrl: string | undefined;
    try {
        const custom = await getCustomSound(kind);
        if (custom) {
            objectUrl = URL.createObjectURL(custom.blob);
            source = objectUrl;
        }
    } catch (e) {
        console.error("Failed to load custom sound, using default", e);
    }

    const audio = new Audio(source);
    if (objectUrl) {
        audio.addEventListener("ended", () => URL.revokeObjectURL(objectUrl));
    }
    audio.play().catch(e => console.error("Failed to play notification sound", e));
}
