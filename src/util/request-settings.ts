import { GetSettingsMessage } from "../models/messages";

const MAX_ATTEMPTS = 3;

export function requestSerializedSettings(attemptNumber: number = 0): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(GetSettingsMessage, (serializedSettings?: string) => {
            if (chrome.runtime.lastError || !serializedSettings) {
                if (attemptNumber + 1 < MAX_ATTEMPTS) {
                    setTimeout(
                        () => void requestSerializedSettings(attemptNumber + 1).then(resolve),
                        100 * (attemptNumber + 1)
                    );
                    return;
                }
                resolve(null);
                return;
            }
            resolve(serializedSettings);
        });
    });
}
