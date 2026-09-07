import { trySendMessage } from "./browser-api";
import { GetSettingsMessage } from "../models/messages";

const MAX_ATTEMPTS = 3;

export async function requestSerializedSettings(attemptNumber: number = 0): Promise<string | null> {
    const serializedSettings = await trySendMessage<string>(GetSettingsMessage);
    if (serializedSettings) {
        return serializedSettings;
    }
    if (attemptNumber + 1 < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attemptNumber + 1)));
        return requestSerializedSettings(attemptNumber + 1);
    }
    return null;
}
