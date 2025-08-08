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
    let matches: boolean = true;

    for (const criterion of autoLabelDirSetting.criteria) {
        if (criterion.value && criterion.field) {
            switch (criterion.field) {
                case 'trackerUrl':
                    matches &&= trackers?.some(tracker => new RegExp(criterion.value).test(tracker));
                default:
                    continue;
            }
        }
    }

    return matches;
}
