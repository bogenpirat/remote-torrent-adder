import { type DecodedTorrent } from "../models/decoded-torrent";
import {
    FetchTorrentInPageMessage,
    type IFetchTorrentInPageMessage,
    type IFetchTorrentInPageResponse
} from "../models/messages";
import { type Torrent } from "../models/torrent";
import { getTorrentNameFromLink } from "./parsers";
import { decodeTorrentBytes } from "./bencode-decode";
import { executeMethodWrappedWithReferer } from "./cors-tricks";
import { getBaseUrl } from "./utils";
import { base64ToBytes, MAX_TORRENT_FILE_BYTES } from "./torrent-bytes";
import { buildTorrentFromDecodedData, buildTorrentFromMagnetLink } from "./torrent-source";

export interface TorrentDownloadContext {
    tabId?: number | null;
    frameId?: number | null;
    pageUrl?: string | null;
}

interface FetchedTorrentFile {
    ok: boolean;
    status: number;
    statusText: string;
    contentType: string | null;
    cfMitigated: string | null;
    finalUrl: string;
    bytes: Uint8Array<ArrayBuffer>;
}

const CLOUDFLARE_CHALLENGE_STATUSES = [403, 429, 503];

const CLOUDFLARE_CHALLENGE_MARKERS = [
    "/cdn-cgi/challenge-platform",
    "challenges.cloudflare.com",
    "__cf_chl",
    "cf_chl_opt",
    "cf-browser-verification"
];

export class CloudflareChallengeError extends Error {
    readonly challengeUrl: string;

    constructor(challengeUrl: string) {
        super("Cloudflare wants to check this browser. Open the link in a tab, complete the check, then add the torrent again.");
        this.name = "CloudflareChallengeError";
        this.challengeUrl = challengeUrl;
    }
}

export async function downloadTorrent(url: string, context: TorrentDownloadContext = {}): Promise<Torrent> {
    if (url.startsWith("magnet:")) {
        return buildTorrentFromMagnetLink(url);
    }

    const fetched = await fetchTorrentFile(url, context);

    if (isCloudflareChallenge(fetched)) {
        throw new CloudflareChallengeError(fetched.finalUrl || url);
    }
    if (!fetched.ok) {
        throw new Error(`Status not OK: ${fetched.status} ${fetched.statusText}`);
    }

    const decodedTorrentData = decodeTorrentDataAndValidate(fetched);

    return buildTorrentFromDecodedData(decodedTorrentData, getTorrentNameFromLink(url), new Blob([fetched.bytes]));
}

async function fetchTorrentFile(url: string, context: TorrentDownloadContext): Promise<FetchedTorrentFile> {
    return await fetchTorrentFileFromPage(url, context) ?? await fetchTorrentFileFromWorker(url, context);
}

async function fetchTorrentFileFromPage(url: string, context: TorrentDownloadContext): Promise<FetchedTorrentFile | null> {
    if (context.tabId === undefined || context.tabId === null || context.tabId < 0) {
        return null;
    }

    const message: IFetchTorrentInPageMessage = { action: FetchTorrentInPageMessage.action, url };
    let response: IFetchTorrentInPageResponse | undefined;
    try {
        response = await chrome.tabs.sendMessage(context.tabId, message, { frameId: context.frameId ?? 0 }) as IFetchTorrentInPageResponse | undefined;
    } catch (error) {
        console.warn("No content script answered in tab " + context.tabId + "; downloading from the service worker instead.", error);
        return null;
    }

    if (!response?.fetched) {
        console.warn("The page could not download the torrent; downloading from the service worker instead.", response?.error);
        return null;
    }

    return {
        ok: response.fetched.ok,
        status: response.fetched.status,
        statusText: response.fetched.statusText,
        contentType: response.fetched.contentType,
        cfMitigated: response.fetched.cfMitigated,
        finalUrl: response.fetched.finalUrl,
        bytes: base64ToBytes(response.fetched.base64)
    };
}

async function fetchTorrentFileFromWorker(url: string, context: TorrentDownloadContext): Promise<FetchedTorrentFile> {
    const referer = context.pageUrl || getBaseUrl(url);

    let response: Response;
    try {
        response = await executeMethodWrappedWithReferer(() => fetch(url, { credentials: "include" }), url, referer);
    } catch (error) {
        throw new Error("Failed to fetch torrent file: " + (error as Error).message, { cause: error });
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_TORRENT_FILE_BYTES) {
        throw new Error(`Response is ${bytes.byteLength} bytes, which is far too large for a torrent file.`);
    }

    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("Content-Type"),
        cfMitigated: response.headers.get("cf-mitigated"),
        finalUrl: response.url || url,
        bytes
    };
}

function isCloudflareChallenge(fetched: FetchedTorrentFile): boolean {
    if (fetched.cfMitigated?.toLowerCase().includes("challenge")) {
        return true;
    }
    if (!CLOUDFLARE_CHALLENGE_STATUSES.includes(fetched.status)) {
        return false;
    }

    const contentType = fetched.contentType?.toLowerCase() ?? "";
    if (contentType && !contentType.includes("text/html")) {
        return false;
    }

    const body = new TextDecoder().decode(fetched.bytes.subarray(0, 64 * 1024));
    return CLOUDFLARE_CHALLENGE_MARKERS.some(marker => body.includes(marker));
}

function decodeTorrentDataAndValidate(fetched: FetchedTorrentFile): DecodedTorrent {
    try {
        return decodeTorrentBytes(fetched.bytes);
    } catch (error) {
        console.error("Invalid torrent data received", fetched.bytes);

        throw new Error("Received " + describeContentType(fetched.contentType) + " instead of a torrent file. Please check the devtools view for details.", { cause: error });
    }
}

function describeContentType(contentType: string | null): string {
    if (!contentType) {
        return "unknown";
    }
    const semicolonPos = contentType.indexOf(";");
    return (semicolonPos < 0 ? contentType : contentType.slice(0, semicolonPos)).trim();
}
