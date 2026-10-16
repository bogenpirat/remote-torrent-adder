import { expect } from "vitest";
import { type Torrent, type TorrentUploadConfig } from "../../src/models/torrent";
import { type TorrentAddingResult, type TorrentWebUI } from "../../src/models/webui";
import { callArgs } from "./assert";
import { mockResponse, queueFetch } from "./fetch-mock";
import { makeMagnetTorrent } from "./fixtures";

interface SentRequest {
    result: TorrentAddingResult;
    url: string;
    body: FormData;
}

export async function sendToAcceptingClient(webUi: TorrentWebUI, torrent: Torrent, config: TorrentUploadConfig = {}): Promise<SentRequest> {
    const fetch = queueFetch(mockResponse({ status: 200, body: "ok" }));
    const result = await webUi.sendTorrent(torrent, config);
    const [url, options] = callArgs(fetch, 0);
    return { result, url, body: options.body as FormData };
}

export async function expectRejectionReported(webUi: TorrentWebUI, status: number, body: string): Promise<void> {
    queueFetch(mockResponse({ status, body }));
    await expect(webUi.sendTorrent(makeMagnetTorrent(), {})).resolves.toMatchObject({
        success: false,
        httpResponseCode: status,
        httpResponseBody: body,
    });
}

export function supportOf(webUi: TorrentWebUI) {
    return { label: webUi.isLabelSupported, dir: webUi.isDirSupported, addPaused: webUi.isAddPausedSupported };
}
