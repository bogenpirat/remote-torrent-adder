import { type WebUISettings } from "./webui";


export type IconClickAction = "openPrimaryWebUi" | "showWebUiPicker" | "showPageLinks";

export interface RTASettings {
    notificationsEnabled: boolean;
    notificationsDurationMs: number;
    notificationsSoundEnabled: boolean;
    notificationsLabelButtonEnabled: boolean;

    linkCatchingEnabled: boolean;
    linkCatchingRegexes: RegExp[];

    iconClickAction: IconClickAction;

    webuiSettings: WebUISettings[];
}
