import { Client } from "../../../../src/models/clients";
import { basicAuth, type ClientProbe, trimTrailingSlash } from "../client-probe";
import { waitFor } from "../docker";

const RPC_URL = "http://127.0.0.1:18091/transmission/rpc";
const USERNAME = "rta";
const PASSWORD = "rta-it-pass";

const STATUS_STOPPED = 0;
const STATUS_CHECK_WAIT = 1;
const STATUS_CHECKING = 2;

let sessionId = "";

export async function transmissionRpc(
    url: string,
    username: string,
    password: string,
    method: string,
    args: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
    for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(url, {
            method: "POST",
            headers: { ...basicAuth(username, password), "X-Transmission-Session-Id": sessionId },
            body: JSON.stringify({ method, arguments: args }),
        });
        if (response.status === 409) {
            sessionId = response.headers.get("X-Transmission-Session-Id") ?? "";
            continue;
        }
        if (!response.ok) {
            throw new Error(`Transmission answered ${response.status}`);
        }
        return (await response.json()) as Record<string, unknown>;
    }
    throw new Error("Transmission kept rejecting the session id");
}

export const transmission: ClientProbe = {
    profile: "transmission",
    client: Client.TransmissionWebUI,
    port: 18091,
    username: USERNAME,
    password: PASSWORD,
    label: "rta-it-label",
    dir: "/downloads/rta-it",

    async prepare() {
        await waitFor("Transmission to answer RPC", async () => {
            const result = await transmissionRpc(RPC_URL, USERNAME, PASSWORD, "session-set", { "dht-enabled": false, "pex-enabled": false, "lpd-enabled": false });
            return result.result === "success" ? true : null;
        });
    },

    async find(infoHash) {
        const result = await transmissionRpc(RPC_URL, USERNAME, PASSWORD, "torrent-get", {
            ids: [infoHash],
            fields: ["hashString", "downloadDir", "status", "labels"],
        });
        const [torrent] = ((result.arguments as { torrents?: Record<string, unknown>[] })?.torrents ?? []);
        if (!torrent || torrent.status === STATUS_CHECK_WAIT || torrent.status === STATUS_CHECKING) {
            return null;
        }
        return {
            label: ((torrent.labels as string[] | undefined) ?? [])[0] ?? null,
            dir: trimTrailingSlash(torrent.downloadDir as string),
            paused: torrent.status === STATUS_STOPPED,
            raw: torrent,
        };
    },
};
