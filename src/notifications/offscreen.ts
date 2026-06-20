import { IPlaySoundMessage, PlaySoundMessage } from "../models/messages";
import { getCustomSound, SoundKind } from "../util/sound-storage";

chrome.runtime.onMessage.addListener(message => {
    if (message.action === PlaySoundMessage.action) {
        playNotificationSound((message as IPlaySoundMessage).isFailed);
    }
});

// Play the user's custom sound for this outcome if one is stored, otherwise
// fall back to the bundled default. Runs in the offscreen document, which has
// DOM access (Audio, URL.createObjectURL) the service worker lacks.
async function playNotificationSound(isFailed: boolean): Promise<void> {
    const kind: SoundKind = isFailed ? "failure" : "success";

    let source = `../assets/sounds/${kind}.ogg`;
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
        audio.addEventListener("ended", () => URL.revokeObjectURL(objectUrl!));
    }
    audio.play().catch(e => console.error("Failed to play notification sound", e));
}
