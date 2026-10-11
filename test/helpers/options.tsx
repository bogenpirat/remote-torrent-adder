import { type ReactElement } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { GetSettingsMessage, SaveSettingsMessage } from "../../src/models/messages";
import { type RTASettings } from "../../src/models/settings";
import { SettingsProvider } from "../../src/options/SettingsContext";
import { deserializeSettings, serializeSettings } from "../../src/util/serializer";
import { getDefaultSettings } from "../../src/util/settings-defaults";

type MessageResponder = (message: any) => Promise<unknown>;

const respondWithNothing: MessageResponder = () => Promise.resolve(undefined);

export function respondWithSettings(overrides: Partial<RTASettings> = {}, respondToOthers = respondWithNothing): RTASettings {
    const settings = { ...getDefaultSettings(), ...overrides };
    (chrome.runtime.sendMessage as any).mockImplementation((message: any) => {
        const isSettingsRequest = message.action === GetSettingsMessage.action;
        return isSettingsRequest ? Promise.resolve(serializeSettings(settings)) : respondToOthers(message);
    });
    return settings;
}

export function renderWithSettings(page: ReactElement): RenderResult {
    return render(<SettingsProvider>{page}</SettingsProvider>);
}

export function sentMessages(action: string): any[] {
    return (chrome.runtime.sendMessage as any).mock.calls
        .map((call: any[]) => call[0])
        .filter((message: any) => message?.action === action);
}

export function lastSavedSettings(): RTASettings | undefined {
    const save = sentMessages(SaveSettingsMessage.action).at(-1);
    return save ? deserializeSettings(save.settings) ?? undefined : undefined;
}
