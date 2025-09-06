import { Torrent, TorrentUploadConfig } from "../models/torrent";
import { TorrentAddingResult, TorrentWebUI } from "../models/webui";

export class QNAPDownloadStationWebUI extends TorrentWebUI {
    public override async sendTorrent(torrent: Torrent, config: TorrentUploadConfig): Promise<TorrentAddingResult> {
        return new Promise(async (resolve, reject) => {
            this.fetchSessionId()
                .then(sessionId => this.createTorrentFetchOptions(sessionId, torrent, config))
                .then(fetchOptions => this.sendRequest(this.createAddingUrlForTorrent(torrent), fetchOptions, resolve, reject));
        });
    }

    private createQNAPDownloadStationBaseUrl(): string {
        return [
            this.createBaseUrl(),
            "/downloadstation/V4",
        ].join("");
    }

    private createAddingUrlForTorrent(torrent: Torrent): string {
        return this.createQNAPDownloadStationBaseUrl() + (torrent.isMagnet ? "/Task/AddUrl" : "/Task/AddTorrent");
    }

    private fetchSessionId(): Promise<string> {
        return new Promise((resolve, reject) => {
            const loginUrl = this.createQNAPDownloadStationBaseUrl() + "/Misc/Login";
            const payload = new FormData();
            payload.append("user", this.settings.username);
            payload.append("pass", btoa(this.settings.password));
            fetch(loginUrl, { method: 'POST', body: payload })
                .then(response =>
                response.json()
            ).then(json => {
                if (json.error) {
                    reject(new Error(json.error));
                } else {
                    resolve(json.sid);
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    private createTorrentFetchOptions(sessionId: string, torrent: Torrent, config: TorrentUploadConfig): Promise<RequestInit> {
        return new Promise(async (resolve, reject) => {
            const payload = new FormData();
            payload.append("sid", sessionId);

            if (this.getDirectory(config)) {
                payload.append("temp", this.getDirectory(config));
                payload.append("move", this.getDirectory(config));
            }

            if (torrent.isMagnet) {
                payload.append("url", torrent.data as string);
            } else {
                payload.append("file", new Blob([await (torrent.data as Blob).arrayBuffer()], { type: "application/octet-stream" }), torrent.name);
            }

            resolve({
                method: 'POST',
                body: payload
            } as RequestInit);
        });
    }

    private sendRequest(url: string, fetchOptions: RequestInit, resolve: (result: TorrentAddingResult) => void, reject: (error: TorrentAddingResult) => void): void {
        this.fetch(url, fetchOptions).then(async (response) => {
            const responseText = await response.text();
            if(response.status === 200) {
                const responseJson = JSON.parse(responseText);
                switch(responseJson["error"]) {
                    case 0:
                    case 8196: // 8196 = "The task already exists"
                        resolve({ success: true, httpResponseCode: response.status, httpResponseBody: responseText });
                        break;
                    default:
                        reject({ success: false, httpResponseCode: response.status, httpResponseBody: responseText });
                        break;
                }
            }

            reject({ success: false, httpResponseCode: response.status, httpResponseBody: responseText });
        }).catch(error => {
            reject({ success: false, httpResponseCode: 0, httpResponseBody: error.message || null });
        });
    }

    get isLabelSupported(): boolean {
        return false;
    }

    get isDirSupported(): boolean {
        return true;
    }

    get isAddPausedSupported(): boolean {
        return false;
    }
}
