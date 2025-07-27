import { RTASettings } from "../models/settings";

export function getDefaultSettings(): RTASettings {
    return {
        notificationsEnabled: true,
        notificationsDurationMs: 2000,
        notificationsSoundEnabled: false,

        linkCatchingEnabled: true,
        linkCatchingRegexes: [
            /([\]\[]|\b|\.)\.torrent\b([^\-]|$)/,
            /torrents\.php\?action=download/
        ],
        newTabCatchingEnabled: false,
        linkCatchingScanDelayMs: 0,

        webuiSettings: [] // TODO: should probably add an empty one? or not? who knows, i sure don't
    };
}