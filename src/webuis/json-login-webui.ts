import { type ConnectionTestResult, TorrentWebUI } from "../models/webui";
import { fetchOrThrow, toAuthenticatedResult, toRejectedResult, toUnreachableResult } from "../models/webui-http";

export type LoginAnswer = Record<string, unknown>;

const REJECTED_LOGIN_MESSAGE = "Authentication failed";

export abstract class JsonLoginWebUI extends TorrentWebUI {
    protected abstract get loginUrl(): string;

    protected abstract isLoginAccepted(answer: LoginAnswer): boolean;

    public override async testConnection(): Promise<ConnectionTestResult> {
        try {
            const response = await fetch(this.loginUrl, this.createLoginFetchOptions());
            const isAccepted = response.ok && this.isLoginAccepted(await response.json());
            return isAccepted ? toAuthenticatedResult(response.status) : toRejectedResult(response.status);
        } catch (error) {
            return toUnreachableResult(error);
        }
    }

    protected async authenticate(): Promise<LoginAnswer> {
        const response = await fetchOrThrow(this.loginUrl, this.createLoginFetchOptions());
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
        return this.createJsonPostOptions({ username: this.settings.username, password: this.settings.password });
    }
}
