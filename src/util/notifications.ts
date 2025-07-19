
export function showNotification(title: string, message: string, isFailed: boolean = true, popupDurationMs: number = 2000, playSound: boolean = false): void {
    var notificationCreateOptions: chrome.notifications.NotificationCreateOptions = {
        type: "basic",
        iconUrl: (isFailed === true) ? "icons/BitTorrent128-red.png" : "icons/BitTorrent128.png",
        title: title,
        priority: 0,
        message: message
    };

    chrome.notifications.create(null, notificationCreateOptions, myId => {
        setTimeout(function () {
            chrome.notifications.clear(myId, function () { });
        }, popupDurationMs);
    });

    if (playSound) {
        playAudioNotification(isFailed);
    }
}

function playAudioNotification(isFailed: boolean): void {
    new Audio(isFailed ? 'assets/sounds/failure.ogg' : 'assets/sounds/success.ogg').play();
}