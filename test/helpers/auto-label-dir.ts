import { type Torrent } from "../../src/models/torrent";
import { type AutoLabelDirCriterion, type AutoLabelDirSetting } from "../../src/models/webui";

type SettingBuilder = (value: string, label: string | null, dir: string | null) => AutoLabelDirSetting;

export const torrentWith = (trackers?: string[], files?: string[], name = "t"): Torrent => ({
    data: "magnet:?x",
    name,
    declaredName: name,
    isMagnet: true,
    trackers,
    files,
});

function settingMatching(field: AutoLabelDirCriterion["field"]): SettingBuilder {
    return (value, label, dir) => ({ criteria: [{ field, value }], label, dir });
}

export const setting = settingMatching("trackerUrl");
export const fileSetting = settingMatching("filePath");
export const nameSetting = settingMatching("torrentName");
