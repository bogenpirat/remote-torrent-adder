import { Client } from "../../../../src/models/clients";
import { type ClientProbe, trimTrailingSlash } from "../client-probe";
import { waitFor } from "../docker";

const RPC_URL = "http://127.0.0.1:18337/api/v1/jsonrpc";
const USERNAME = "rta";
const PASSWORD = "rta-it-pass";

interface PorlaTorrent extends Record<string, unknown> {
    info_hash: [string | null, string | null];
    save_path: string;
    flags?: string[];
    $userdata?: { category?: string | null };
}

async function call<T>(method: string, params: Record<string, unknown>, token?: string): Promise<{ result?: T; error?: { code: number } }> {
    const response = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    return (await response.json()) as { result?: T; error?: { code: number } };
}

async function login(): Promise<string | null> {
    return (await call<{ token: string }>("auth.login", { username: USERNAME, password: PASSWORD })).result?.token ?? null;
}

export const porla: ClientProbe = {
    profile: "porla",
    client: Client.PorlaWebUI,
    port: 18337,
    username: USERNAME,
    password: PASSWORD,
    label: "rta-it-label",
    dir: "/downloads/rta-it",

    async prepare() {
        await waitFor("Porla to accept a login", async () => {
            const status = await call<{ status: string }>("sys.status", {}).catch(() => null);
            if (status?.result?.status === "setup") {
                await call("auth.init", { username: USERNAME, password: PASSWORD });
            }
            return (await login()) ? true : null;
        });
    },

    async find(infoHash) {
        const token = await login();
        const list = await call<{ torrents: PorlaTorrent[] }>("torrents.list", { page_size: 1000 }, token ?? undefined);
        const torrent = list.result?.torrents.find(candidate => candidate.info_hash[0] === infoHash.toLowerCase());
        if (!torrent) {
            return null;
        }
        return {
            label: torrent.$userdata?.category || null,
            dir: trimTrailingSlash(torrent.save_path),
            paused: !!torrent.flags?.includes("paused") && !torrent.flags.includes("auto_managed"),
            raw: torrent,
        };
    },
};
