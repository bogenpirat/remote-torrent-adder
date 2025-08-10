import { IPlaySoundMessage, PlaySoundMessage } from "../models/messages";

chrome.runtime.onMessage.addListener(message => {
    if (message.action === PlaySoundMessage.action) {
        playAudio((message as IPlaySoundMessage).source);
    } 
});

// Play sound with access to DOM APIs
function playAudio(source: string) {
    const audio = new Audio(source);
    audio.play();
}
