import { type ConnectionTestResult, TorrentWebUI } from "../models/webui";

export type LoginAnswer = Record<string, unknown>;

const REJECTED_LOGIN_MESSAGE = "Authentication failed";

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

    protected async authenticate(): Promise<LoginAnswer> {
        const response = await this.fetch(this.loginUrl, this.createLoginFetchOptions());
        const answer: LoginAnswer = await response.json();
        if (!this.isLoginAccepted(answer)) {
            throw new Error(this.describeRejectedLogin(answer));
        }
        return answer;
    }

    protected describeRejectedLogin(_answer: LoginAnswer): string {
        return REJECTED_LOGIN_MESSAGE;
    }

    protected createJsonPostOptions(payload: unknown, extraHeaders: Record<string, string> = {}): RequestInit {
        return {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=UTF-8", ...extraHeaders },
            body: JSON.stringify(payload)
        };
    }

    private createLoginFetchOptions(): RequestInit {
        return this.createJsonPostOptions({ username: this._settings.username, password: this._settings.password });
    }
}
