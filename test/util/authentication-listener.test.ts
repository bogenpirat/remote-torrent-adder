import { describe, it, expect } from "vitest";
import { registerAuthenticationListenersForAllWebUis } from "../../src/util/authentication-listener";
import { QBittorrentWebUI } from "../../src/webuis/qbittorrent-webui";
import { makeWebUISettings } from "../helpers/fixtures";

const webUi = (over = {}) => new QBittorrentWebUI(makeWebUISettings({ host: "h", port: 8080, ...over }));

const authDetails = (over: Partial<chrome.webRequest.OnAuthRequiredDetails> = {}): any => ({
    tabId: -1,
    requestId: "req-1",
    ...over,
});

describe("registerAuthenticationListenersForAllWebUis", () => {
    it("registers an onAuthRequired listener scoped to the webui url", () => {
        registerAuthenticationListenersForAllWebUis([webUi()]);
        expect(chrome.webRequest.onAuthRequired.addListener).toHaveBeenCalledTimes(1);
        const [, filter, extra] = (chrome.webRequest.onAuthRequired.addListener as any).mock.calls[0];
        expect(filter).toEqual({ urls: ["http://h:8080/*"] });
        expect(extra).toEqual(["blocking"]);
    });

    it("skips webuis missing host or port", () => {
        registerAuthenticationListenersForAllWebUis([webUi({ host: "" })]);
        expect(chrome.webRequest.onAuthRequired.addListener).not.toHaveBeenCalled();
    });

    it("supplies stored credentials on the first auth challenge", () => {
        registerAuthenticationListenersForAllWebUis([webUi({ username: "u", password: "p" })]);
        const listener = (chrome.webRequest.onAuthRequired.addListener as any).mock.calls[0][0];
        expect(listener(authDetails())).toEqual({ authCredentials: { username: "u", password: "p" } });
    });

    it("returns an empty response on the second challenge for the same request", () => {
        registerAuthenticationListenersForAllWebUis([webUi()]);
        const listener = (chrome.webRequest.onAuthRequired.addListener as any).mock.calls[0][0];
        const details = authDetails({ requestId: "dup" });
        listener(details); // first challenge consumes credentials
        expect(listener(details)).toEqual({}); // second hands back to browser
    });

    it("ignores challenges that originate from a real tab", () => {
        registerAuthenticationListenersForAllWebUis([webUi()]);
        const listener = (chrome.webRequest.onAuthRequired.addListener as any).mock.calls[0][0];
        expect(listener(authDetails({ tabId: 5 }))).toEqual({});
    });

    it("forgets a request once it settles, so a later challenge re-supplies credentials", () => {
        registerAuthenticationListenersForAllWebUis([webUi({ username: "u", password: "p" })]);
        const onAuth = (chrome.webRequest.onAuthRequired.addListener as any).mock.calls[0][0];
        const onSettled = (chrome.webRequest.onCompleted.addListener as any).mock.calls[0][0];
        const details = authDetails({ requestId: "r" });

        expect(onAuth(details)).toEqual({ authCredentials: { username: "u", password: "p" } });
        onSettled({ requestId: "r" }); // request completes -> id pruned
        expect(onAuth(details)).toEqual({ authCredentials: { username: "u", password: "p" } });
    });

    it("removes previously registered listeners on re-registration", () => {
        registerAuthenticationListenersForAllWebUis([webUi()]);
        registerAuthenticationListenersForAllWebUis([webUi()]);
        expect(chrome.webRequest.onAuthRequired.removeListener).toHaveBeenCalled();
        expect(chrome.webRequest.onCompleted.removeListener).toHaveBeenCalled();
        expect(chrome.webRequest.onErrorOccurred.removeListener).toHaveBeenCalled();
    });
});
