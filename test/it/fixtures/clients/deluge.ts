import { Client } from "../../../../src/models/clients";
import { type ClientProbe, cookiesFrom, trimTrailingSlash } from "../client-probe";
import { waitFor } from "../docker";

const JSON_URL = "http://127.0.0.1:18112/json";
const PASSWORD = "deluge";

class DelugeSession {
    private cookie = "";

    async call(method: string, ...params: unknown[]): Promise<unknown> {
        const response = await fetch(JSON_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: this.cookie },
            body: JSON.stringify({ method, params, id: 1 }),
        });
        if (!this.cookie) {
            this.cookie = cookiesFrom(response);
        }
        const json = (await response.json()) as { result: unknown; error: { message: string } | null };
        if (json.error) {
            throw new Error(`${method}: ${json.error.message}`);
        }
        return json.result;
    }

    static async login(): Promise<DelugeSession> {
        const session = new DelugeSession();
        if ((await session.call("auth.login", PASSWORD)) !== true) {
            throw new Error("Deluge rejected the password");
        }
        return session;
    }
}

export const deluge: ClientProbe = {
    profile: "deluge",
    client: Client.DelugeWebUI,
    port: 18112,
    username: "",
    password: PASSWORD,
    label: "rta-it-label",
    dir: "/downloads/rta-it",

    async prepare() {
        const session = await waitFor("Deluge to accept a login", () => DelugeSession.login());
        await waitFor("the Deluge WebUI to connect to its daemon", async () => {
            if (await session.call("web.connected")) {
                return true;
            }
            const [host] = (await session.call("web.get_hosts")) as [string][];
            if (host) {
                await session.call("web.connect", host[0]);
            }
            return null;
        });
        await session.call("core.enable_plugin", "Label");
        await session.call("core.set_config", { dht: false, lsd: false, utpex: false });
    },

    async find(infoHash) {
        const session = await DelugeSession.login();
        const torrent = (await session.call("core.get_torrent_status", infoHash, ["label", "download_location", "state"])) as Record<string, unknown>;
        if (!torrent.state || /^(Checking|Allocating|Moving)/.test(torrent.state as string)) {
            return null;
        }
        return {
            label: (torrent.label as string) || null,
            dir: trimTrailingSlash(torrent.download_location as string),
            paused: torrent.state === "Paused",
            raw: torrent,
        };
    },
};
