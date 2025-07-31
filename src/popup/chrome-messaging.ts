import { PreAddTorrentMessage } from "../models/messages";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === PreAddTorrentMessage.action) {
        document.querySelector("body").innerText = `Received PreAddTorrentMessage with URL: ${JSON.stringify(message, null, 2)}`;
    }
});

function closePopup(): void {
    window.close();
}