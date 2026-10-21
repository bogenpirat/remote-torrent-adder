import { Client } from "../../../../src/models/clients";
import { basicAuth, type ClientProbe, trimTrailingSlash } from "../client-probe";
import { waitFor } from "../docker";

const BASE_URL = "http://127.0.0.1:18030";
const USERNAME = "rta";
const PASSWORD = "rta-it-pass";

async function get(path: string): Promise<Response> {
    return fetch(`${BASE_URL}${path}`, { headers: basicAuth(USERNAME, PASSWORD) });
}

export const rqbit: ClientProbe = {
    profile: "rqbit",
    client: Client.RqbitWebUI,
    port: 18030,
    username: USERNAME,
    password: PASSWORD,
    label: "rta-it-label",
    dir: "/home/rqbit/downloads/rta-it",
    addsUnresolvedMagnets: false,

    async prepare() {
        await waitFor("rqbit to answer", async () => ((await get("/torrents")).ok ? true : null));
    },

    async find(infoHash) {
        const details = await get(`/torrents/${infoHash}`);
        if (!details.ok) {
            return null;
        }
        const torrent = (await details.json()) as Record<string, unknown>;
        const stats = (await (await get(`/torrents/${infoHash}/stats/v1`)).json()) as { state?: string };
        if (stats.state === "initializing") {
            return null;
        }
        return {
            label: null,
            dir: trimTrailingSlash(torrent.output_folder as string),
            paused: stats.state === "paused",
            raw: { ...torrent, state: stats.state },
        };
    },
};
