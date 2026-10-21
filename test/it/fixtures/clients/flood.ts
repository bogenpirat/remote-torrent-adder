import { Client } from "../../../../src/models/clients";
import { type ClientProbe, cookiesFrom, trimTrailingSlash } from "../client-probe";
import { waitFor } from "../docker";

const BASE_URL = "http://127.0.0.1:18300";
const USERNAME = "rta";
const PASSWORD = "rta-it-pass";

async function login(): Promise<string | null> {
    const response = await fetch(`${BASE_URL}/api/auth/authenticate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });
    return response.ok ? cookiesFrom(response) : null;
}

export const flood: ClientProbe = {
    profile: "flood",
    client: Client.FloodWebUI,
    port: 18300,
    username: USERNAME,
    password: PASSWORD,
    label: "rta-it-label",
    dir: "/downloads/rta-it",

    async prepare() {
        await waitFor("flood to be registered and connected to Transmission", async () => {
            const verify = (await (await fetch(`${BASE_URL}/api/auth/verify`)).json()) as { initialUser?: boolean };
            if (verify.initialUser) {
                await fetch(`${BASE_URL}/api/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: USERNAME,
                        password: PASSWORD,
                        client: {
                            client: "Transmission",
                            type: "rpc",
                            version: 1,
                            url: "http://flood-transmission:9091/transmission/rpc",
                            username: USERNAME,
                            password: PASSWORD,
                        },
                        level: 10,
                    }),
                });
            }
            const cookie = await login();
            if (!cookie) {
                return null;
            }
            const test = await fetch(`${BASE_URL}/api/client/connection-test`, { headers: { Cookie: cookie } });
            return ((await test.json()) as { isConnected?: boolean }).isConnected ? true : null;
        });
    },

    async find(infoHash) {
        const cookie = await login();
        const response = await fetch(`${BASE_URL}/api/torrents`, { headers: { Cookie: cookie ?? "" } });
        const { torrents } = (await response.json()) as { torrents: Record<string, Record<string, unknown>> };
        const torrent = torrents[infoHash.toUpperCase()];
        const status = (torrent?.status as string[] | undefined) ?? [];
        if (!torrent || status.includes("checking")) {
            return null;
        }
        return {
            label: ((torrent.tags as string[] | undefined) ?? [])[0] ?? null,
            dir: trimTrailingSlash(torrent.directory as string),
            paused: status.includes("stopped"),
            raw: torrent,
        };
    },
};
