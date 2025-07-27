import { RTASettings } from "../models/settings";
import { WebUISettings } from "../models/webui";
import { getDefaultSettings } from "./settings-defaults";
import { Client, WebUIFactory } from "../models/clients";

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
                linkCatchingScanDelayMs: parseInt(response["registerDelay"] ?? defaults.linkCatchingScanDelayMs, 10),
                newTabCatchingEnabled: JSON.parse(response["catchfromnewtab"] ?? defaults.newTabCatchingEnabled),
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
        const serverList = JSON.parse(servers); // TODO note to self; JSON.parse(response["servers"))
        serverList.forEach((server: Record<string, any>) => {
            const webUiSettings: WebUISettings = {
                client: getClientForLegacyName(server.client),
                name: server.name,
                host: server.host,
                port: server.port,
                secure: server.hostsecure || false,
                relativePath: server.relativePath || server.ruTorrentrelativepath || server.delugerelativepath || server.rtorrentxmlrpcrelativepath || server.torrentfluxrelativepath || server.utorrentrelativepath || null,
                username: server.login || "",
                password: server.password || "",
                labels: server.labellist ? JSON.parse(server.labellist) : [],
                dirs: server.dirlist ? JSON.parse(server.dirlist) : [],
                defaultLabel: server.rutorrentlabel || server.hadoukenlabel || null,
                defaultDir: server.rutorrentdirectory || server.floodjesecdirectory || server.hadoukendir || server.flooddirectory || server.qnapmove || null,
                addPaused: server.addPaused || server.floodjesecaddpaused || server.rutorrentaddpaused || server.rtorrentaddpaused || server.floodaddpaused || false,
                clientSpecificSettings: { // TODO: some stuff to map here from the old config.js

                } 
            } as WebUISettings;

            if (WebUIFactory.createWebUI(webUiSettings) !== null) {
                webuiSettingsList.push(webUiSettings);
            } else {
                console.warn(`Couldn't convert legacy client to new settings format: ${JSON.stringify(server)}`);
            }
        });
    }

    return webuiSettingsList;
}

function getClientForLegacyName(name: string): Client | null {
    switch (name) {
        case "Buffalo WebUI (OLD!)":
            return Client.BuffaloWebUI;
        case "Vuze Remote WebUI":
            return Client.BiglyBTWebUI;
    }

    return name as Client || null;
}
