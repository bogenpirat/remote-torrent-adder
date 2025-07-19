import { RTASettings } from "../models/settings";

export function customReplacer(key: string, value: any): any {
    if (value instanceof RegExp) {
        return { __type: "RegExp", source: value.source, flags: value.flags };
    }
    return value;
}

export function customReviver(key: string, value: any): any {
    if (value && value.__type === "RegExp") {
        return new RegExp(value.source, value.flags);
    }
    return value;
}

export function serializeSettings(settings: RTASettings): string {
    return JSON.stringify(settings, customReplacer);
}

export function deserializeSettings(serialized: string): RTASettings | null {
    if (!serialized) {
        return null;
    }
    return JSON.parse(serialized, customReviver);
}
