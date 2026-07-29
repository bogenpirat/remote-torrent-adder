import { Torrent } from "../models/torrent";
import { AutoLabelDirSetting } from "../models/webui";


export function getAutoLabelResult(torrent: Torrent, autoLabelDirSettings: Array<AutoLabelDirSetting>): string | null {
    if (autoLabelDirSettings) {
        for (const autoLabelDirSetting of autoLabelDirSettings) {
            if (isAutoLabelDirSettingMatchingForTorrent(autoLabelDirSetting, torrent)) {
                return autoLabelDirSetting.label;
            }
        }
    }

    return null;
}

export function getAutoDirResult(torrent: Torrent, autoLabelDirSettings: Array<AutoLabelDirSetting>): string | null {
    if (autoLabelDirSettings) {
        for (const autoLabelDirSetting of autoLabelDirSettings) {
            if (isAutoLabelDirSettingMatchingForTorrent(autoLabelDirSetting, torrent)) {
                return autoLabelDirSetting.dir;
            }
        }
    }

    return null;
}

function isAutoLabelDirSettingMatchingForTorrent(autoLabelDirSetting: AutoLabelDirSetting, torrent: Torrent): boolean {
    if (autoLabelDirSetting.criteria.length === 0) {
        return false;
    }

    return autoLabelDirSetting.criteria.every(criterion => {
        if (!criterion.value) {
            return true;
        }
        switch (criterion.field) {
            case "trackerUrl": return matchesAny(criterion.value, torrent.trackers, "");
            case "filePath": return matchesAny(criterion.value, torrent.files, "i");
            default: return true;
        }
    });
}

function matchesAny(pattern: string, candidates: string[] | undefined, flags: string): boolean {
    let regex: RegExp;
    try {
        regex = new RegExp(pattern, flags);
    } catch {
        return false;
    }
    return candidates?.some(candidate => regex.test(candidate)) ?? false;
}
