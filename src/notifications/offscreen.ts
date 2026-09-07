import { ext } from "../util/browser-api";
import { type IPlaySoundMessage, PlaySoundMessage } from "../models/messages";
import { playNotificationSound } from "../util/play-sound";

ext.runtime.onMessage.addListener(message => {
    if (message.action === PlaySoundMessage.action) {
        void playNotificationSound((message as IPlaySoundMessage).isFailed);
    }
});
