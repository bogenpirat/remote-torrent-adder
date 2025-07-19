import { RTASettings } from "../models/settings";

export function getDefaultSettings(): RTASettings {
    return {
        popupsEnabled: true,
        popupsDurationMs: 2000,
        popupsSoundEnabled: false,

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