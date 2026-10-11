import { type ConnectionTestResult, TorrentWebUI } from "../models/webui";
import { probeWithBasicAuth } from "../models/webui-http";

export abstract class BasicAuthWebUI extends TorrentWebUI {
    protected abstract readonly connectionProbePath: string;

    public override testConnection(): Promise<ConnectionTestResult> {
        return probeWithBasicAuth(this.createBaseUrl() + this.connectionProbePath, this.settings);
    }
}
