import { type ConnectionTestResult, TorrentWebUI } from "../models/webui";

export type LoginAnswer = Record<string, unknown>;

export abstract class JsonLoginWebUI extends TorrentWebUI {
    protected abstract get loginUrl(): string;

    protected abstract isLoginAccepted(answer: LoginAnswer): boolean;

    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const response = await fetch(this.loginUrl, this.createLoginFetchOptions());
            if (!response.ok) {
                return this.toReachableResult(false, response.status);
            }
            return this.toReachableResult(this.isLoginAccepted(await response.json()), response.status);
        } catch (error) {
            return this.toUnreachableResult(error);
        }
    }

    protected async login(): Promise<LoginAnswer> {
        const response = await this.fetch(this.loginUrl, this.createLoginFetchOptions());
        return response.json();
    }

    private createLoginFetchOptions(): RequestInit {
        return {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            body: JSON.stringify({ username: this._settings.username, password: this._settings.password })
        };
    }
}
