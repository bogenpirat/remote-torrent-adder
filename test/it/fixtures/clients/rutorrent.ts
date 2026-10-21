import { Client } from "../../../../src/models/clients";
import { type ClientProbe, trimTrailingSlash } from "../client-probe";
import { waitFor } from "../docker";

const BASE_URL = "http://127.0.0.1:18081";

const STATE = 3;
const LABEL = 14;
const DIRECTORY = 35;

export const rutorrent: ClientProbe = {
    profile: "rutorrent",
    client: Client.RuTorrentWebUI,
    port: 18081,
    username: "",
    password: "",
    requiresAuth: false,
    label: "rta-it-label",
    dir: "/downloads/complete/rta-it",

    async prepare() {
        await waitFor("ruTorrent to load its settings", async () => {
            const response = await fetch(`${BASE_URL}/php/getplugins.php`);
            return response.ok ? true : null;
        });
    },

    async find(infoHash) {
        const response = await fetch(`${BASE_URL}/plugins/httprpc/action.php`, {
            method: "POST",
            body: new URLSearchParams({ mode: "list", cmd: "d.directory=" }),
        });
        const list = (await response.json()) as { t?: Record<string, string[]> };
        const torrent = list.t?.[infoHash.toUpperCase()];
        if (!torrent) {
            return null;
        }
        return {
            label: decodeURIComponent(torrent[LABEL] ?? "") || null,
            dir: trimTrailingSlash(torrent[DIRECTORY]),
            paused: torrent[STATE] === "0",
            raw: { fields: torrent },
        };
    },
};
