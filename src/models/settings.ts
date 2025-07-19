import { WebUISettings } from "./webui";


export interface RTASettings {
    popupsEnabled: boolean;
    popupsDurationMs: number;
    popupsSoundEnabled: boolean;

    linkCatchingEnabled: boolean;
    linkCatchingRegexes: RegExp[];
    newTabCatchingEnabled: boolean;
    linkCatchingScanDelayMs: number;

    webuiSettings: WebUISettings[];
}
