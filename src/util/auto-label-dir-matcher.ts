import { Torrent } from "../models/torrent";
import { AutoLabelDirSetting } from "../models/webui";


export function getAutoLabelResult(torrent: Torrent, autoLabelDirSettings: Array<AutoLabelDirSetting>): string | null {
    if (autoLabelDirSettings) {
        for (const autoLabelDirSetting of autoLabelDirSettings) {
            if (isAutoLabelDirSettingMatchingForTorrent(autoLabelDirSetting, torrent.trackers)) {
                return autoLabelDirSetting.label;
            }
        }
    }

    return null;
}

export function getAutoDirResult(torrent: Torrent, autoLabelDirSettings: Array<AutoLabelDirSetting>): string | null {
    if (autoLabelDirSettings) {
        for (const autoLabelDirSetting of autoLabelDirSettings) {
            if (isAutoLabelDirSettingMatchingForTorrent(autoLabelDirSetting, torrent.trackers)) {
                return autoLabelDirSetting.dir;
            }
        }
    }

    return null;
}

function isAutoLabelDirSettingMatchingForTorrent(autoLabelDirSetting: AutoLabelDirSetting, trackers?: string[]): boolean {
    if (autoLabelDirSetting.criteria.length === 0) {
        return false;
    }

    return autoLabelDirSetting.criteria.every(criterion => {
        if (criterion.field === "trackerUrl" && criterion.value) {
            return matchesTrackerUrl(criterion.value, trackers);
        }
        return true;
    });
}

function matchesTrackerUrl(pattern: string, trackers?: string[]): boolean {
    let regex: RegExp;
    try {
        regex = new RegExp(pattern);
    } catch {
        return false;
    }
    return trackers?.some(tracker => regex.test(tracker)) ?? false;
}
