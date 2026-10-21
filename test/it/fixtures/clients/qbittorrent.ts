import { Client } from "../../../../src/models/clients";
import { type ClientProbe, cookiesFrom, trimTrailingSlash } from "../client-probe";
import { composeLogs, waitFor } from "../docker";

const BASE_URL = "http://127.0.0.1:18080";
const USERNAME = "rta";
const PASSWORD = "rta-it-pass";

async function login(username: string, password: string): Promise<string | null> {
    const response = await fetch(`${BASE_URL}/api/v2/auth/login`, {
        method: "POST",
        body: new URLSearchParams({ username, password }),
    });
    return response.ok ? cookiesFrom(response) : null;
}

async function temporaryPassword(): Promise<string | null> {
    const logs = await composeLogs("qbittorrent", "qbittorrent");
    return /temporary password is provided for this session: (\S+)/.exec(logs)?.[1] ?? null;
}

export const qbittorrent: ClientProbe = {
    profile: "qbittorrent",
    client: Client.QBittorrentWebUI,
    port: 18080,
    username: USERNAME,
    password: PASSWORD,
    label: "rta-it-label",
    dir: "/downloads/rta-it",

    async prepare() {
        await waitFor("qBittorrent to accept a login", async () => {
            if (await login(USERNAME, PASSWORD)) {
                return true;
            }
            const temporary = await temporaryPassword();
            const cookie = temporary ? await login("admin", temporary) : null;
            if (!cookie) {
                return null;
            }
            await fetch(`${BASE_URL}/api/v2/app/setPreferences`, {
                method: "POST",
                headers: { Cookie: cookie },
                body: new URLSearchParams({
                    json: JSON.stringify({
                        web_ui_username: USERNAME,
                        web_ui_password: PASSWORD,
                        web_ui_max_auth_fail_count: 0,
                        dht: false,
                        pex: false,
                        lsd: false,
                    }),
                }),
            });
            return null;
        });
    },

    async find(infoHash) {
        const cookie = await login(USERNAME, PASSWORD);
        const response = await fetch(`${BASE_URL}/api/v2/torrents/info?hashes=${infoHash}`, { headers: { Cookie: cookie ?? "" } });
        const [torrent] = (await response.json()) as Record<string, unknown>[];
        if (!torrent || /^(checking|allocating|moving|unknown)/.test(torrent.state as string)) {
            return null;
        }
        return {
            label: (torrent.category as string) || null,
            dir: trimTrailingSlash(torrent.save_path as string),
            paused: /^(stopped|paused)/.test(torrent.state as string),
            raw: torrent,
        };
    },
};
