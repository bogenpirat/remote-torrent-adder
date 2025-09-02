import { RTASettings } from "../models/settings";
import { WebUISettings, AutoLabelDirSetting } from "../models/webui";
import { getDefaultSettings } from "./settings-defaults";
import { Client, WebUIFactory } from "../models/clients";
import { Settings } from "./settings";
import { generateId } from "./utils";


export async function convertLegacySettingsToRTASettings(): Promise<RTASettings | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get(["showpopups", "popupduration", "hearpopups", "catchfrompage", "linkmatches", "registerDelay", "catchfromnewtab", "servers"], async (response) => {
            if (Object.keys(response).length === 0) {
                console.log("Failed to convert legacy settings: No old settings found.", response);
                resolve(null);
                return;
            }

            const defaults = getDefaultSettings();
            const newSettings: RTASettings = {
                notificationsEnabled: JSON.parse(response["showpopups"] ?? defaults.notificationsEnabled),
                notificationsDurationMs: parseInt(response["popupduration"] ?? defaults.notificationsDurationMs, 10),
                notificationsSoundEnabled: JSON.parse(response["hearpopups"] ?? defaults.notificationsSoundEnabled),
                linkCatchingEnabled: JSON.parse(response["catchfrompage"] ?? defaults.linkCatchingEnabled),
                linkCatchingRegexes: parseLinkMatches(response["linkmatches"]),
                webuiSettings: parseServers(response["servers"]),
            };

            console.log("Converted legacy settings to RTASettings:", newSettings);
            resolve(newSettings);
        });
    });
}

function parseLinkMatches(regexList: string | null): RegExp[] {
    const regexes: RegExp[] = [];

    if (regexList) {
        regexList.split("~").forEach((regexStr) => {
            if (regexStr.trim()) {
                try {
                    regexes.push(new RegExp(regexStr.trim()));
                } catch (e) {
                    console.error(`Invalid regex: ${regexStr}`, e);
                }
            }
        });
    }

    if (regexes.length === 0) {
        return getDefaultSettings().linkCatchingRegexes;
    }

    return regexes;
}

function parseServers(servers: string | null): WebUISettings[] {
    const webuiSettingsList: WebUISettings[] = [];

    if (servers) {
        const serverList = JSON.parse(servers);
        serverList.forEach((server: Record<string, any>) => {
            const client = getClientForLegacyName(server.client);
            console.debug(`converting "${server.client}" to "${client}"`);
            if(client) {
                const webUiSettings: WebUISettings = {
                    id: generateId(),
                    client,
                    name: server.name,
                    host: server.host,
                    port: server.port,
                    secure: server.hostsecure || false,
                    relativePath: server.relativePath || server.ruTorrentrelativepath || server.delugerelativepath || server.rtorrentxmlrpcrelativepath || server.torrentfluxrelativepath || server.utorrentrelativepath || null,
                    username: server.login || "",
                    password: server.password || "",
                    showPerTorrentConfigSelector: server.rutorrentdirlabelask || server.qbittorrentdirlabelask || server.qbittorrentv2dirlabelask || false,
                    labels: server.labellist ? pruneEmptyEntries(JSON.parse(server.labellist)) : [],
                    dirs: server.dirlist ? pruneEmptyEntries(JSON.parse(server.dirlist)) : [],
                    defaultLabel: server.rutorrentlabel || server.hadoukenlabel || null,
                    defaultDir: server.rutorrentdirectory || server.floodjesecdirectory || server.hadoukendir || server.flooddirectory || server.qnapmove || null,
                    addPaused: server.addPaused || server.floodjesecaddpaused || server.rutorrentaddpaused || server.rtorrentaddpaused || server.floodaddpaused || false,
                    autoLabelDirSettings: parseAutoLabelDirSettings(server.autolabellist, server.autodirlist),
                    clientSpecificSettings: { // TODO: some stuff to map here from the old config.js

                    }
                } as WebUISettings;

                if (WebUIFactory.createWebUI(webUiSettings) !== null) {
                    webuiSettingsList.push(webUiSettings);
                } else {
                    console.warn(`Couldn't convert legacy client to new settings format: ${JSON.stringify(server)}`);
                }
            } else {
                console.warn(`Unknown client in legacy settings: ${server.client}`);
            }
        });
    }

    return webuiSettingsList;
}

function getClientForLegacyName(name: string): Client | null {
    switch (name) {
        case "Vuze Remote WebUI":
            return Client.BiglyBTWebUI;
        case "qBittorrent v4.1+ WebUI":
            return Client.QBittorrentWebUI;
        case "flood-jesec WebUI":
            return Client.FloodWebUI;
        case "Bigly/Vuze Remote WebUI":
            return Client.BiglyBTWebUI;
    }

    return name as Client || null;
}

function parseAutoLabelDirSettings(autolabellist: any, autodirlist: any): Array<AutoLabelDirSetting> {
    const labelByTrackerUrl: Record<string, string> = {};
    const dirByTrackerUrl: Record<string, string> = {};

    if (autolabellist) {
        for (const parsedAutoLabel of JSON.parse(autolabellist)) {
            const [trackerUrl, label] = parsedAutoLabel.split(",");
            labelByTrackerUrl[trackerUrl] = label;
        }
    }

    if (autodirlist) {
        for (const parsedAutoDir of JSON.parse(autodirlist)) {
            const [trackerUrl, dir] = parsedAutoDir.split(",");
            dirByTrackerUrl[trackerUrl] = dir;
        }
    }

    const autoLabelDirSettings: Array<AutoLabelDirSetting> = [];
    for (const trackerUrl of new Set([...Object.keys(labelByTrackerUrl), ...Object.keys(dirByTrackerUrl)])) {
        autoLabelDirSettings.push({
            criteria: [
                {
                    field: "trackerUrl",
                    value: trackerUrl
                }
            ],
            label: labelByTrackerUrl[trackerUrl],
            dir: dirByTrackerUrl[trackerUrl]
        });
    }

    return autoLabelDirSettings;
}

function pruneEmptyEntries(array: string[]): string[] {
    return array.filter(item => item !== null && item !== undefined && item.trim() !== "");
}
