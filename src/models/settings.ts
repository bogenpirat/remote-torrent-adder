import { WebUISettings } from "./webui";


export interface RTASettings {
    notificationsEnabled: boolean;
    notificationsDurationMs: number;
    notificationsSoundEnabled: boolean;

    linkCatchingEnabled: boolean;
    linkCatchingRegexes: RegExp[];

    webuiSettings: WebUISettings[];
}
