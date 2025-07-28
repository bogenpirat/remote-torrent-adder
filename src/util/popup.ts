
function activatePopup(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "activatePopup") {
            chrome.action.openPopup();
        }
    });
}
