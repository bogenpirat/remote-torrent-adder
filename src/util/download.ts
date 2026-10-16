import { ext } from "./browser-api";
import { type DecodedTorrent } from "../models/decoded-torrent";
import {
    FetchTorrentInPageMessage,
    type IFetchedTorrentFile,
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
import { messageOf } from "../models/error-message";

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

interface PageTarget {
    tabId: number;
    frameId: number;
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

async function fetchTorrentFileFromPage(url: string, context: TorrentDownloadContext): Promise<FetchedTorrentFile | undefined> {
    const tabId = context.tabId ?? -1;
    if (tabId < 0) {
        return undefined;
    }
    const response = await askPageToFetch(url, { tabId, frameId: context.frameId ?? 0 });
    if (!response.fetched) {
        console.warn("The page could not download the torrent; downloading from the service worker instead.", response.error);
        return undefined;
    }
    return toFetchedTorrentFile(response.fetched);
}

async function askPageToFetch(url: string, target: PageTarget): Promise<IFetchTorrentInPageResponse> {
    const message: IFetchTorrentInPageMessage = { action: FetchTorrentInPageMessage.action, url };
    try {
        const frame = { frameId: target.frameId };
        const response: IFetchTorrentInPageResponse | undefined = await ext.tabs.sendMessage(target.tabId, message, frame);
        return response ?? { error: "The content script in tab " + target.tabId + " answered with nothing." };
    } catch (error) {
        return { error: "No content script answered in tab " + target.tabId + ": " + messageOf(error) };
    }
}

function toFetchedTorrentFile(fetched: IFetchedTorrentFile): FetchedTorrentFile {
    return {
        ok: fetched.ok,
        status: fetched.status,
        statusText: fetched.statusText,
        contentType: fetched.contentType,
        cfMitigated: fetched.cfMitigated,
        finalUrl: fetched.finalUrl,
        bytes: base64ToBytes(fetched.base64)
    };
}

async function fetchTorrentFileFromWorker(url: string, context: TorrentDownloadContext): Promise<FetchedTorrentFile> {
    const response = await fetchWithReferer(url, context.pageUrl || getBaseUrl(url));

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

async function fetchWithReferer(url: string, referer: string): Promise<Response> {
    try {
        return await executeMethodWrappedWithReferer(() => fetch(url, { credentials: "include" }), url, referer);
    } catch (error) {
        throw new Error("Failed to fetch torrent file: " + messageOf(error), { cause: error });
    }
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

        const received = describeContentType(fetched.contentType);
        throw new Error(`Received ${received} instead of a torrent file. Please check the devtools view for details.`, { cause: error });
    }
}

function describeContentType(contentType: string | null): string {
    if (!contentType) {
        return "unknown";
    }
    const semicolonPos = contentType.indexOf(";");
    return (semicolonPos < 0 ? contentType : contentType.slice(0, semicolonPos)).trim();
}
