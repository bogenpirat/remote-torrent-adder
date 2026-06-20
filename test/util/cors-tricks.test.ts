import { describe, it, expect, vi } from "vitest";
import {
    registerCorsCircumventionForWebUis,
    executeMethodWrappedWithReferer,
} from "../../src/util/cors-tricks";
import { QBittorrentWebUI } from "../../src/webuis/qbittorrent-webui";
import { makeWebUISettings } from "../helpers/fixtures";

const webUi = (over = {}) => new QBittorrentWebUI(makeWebUISettings(over));

describe("registerCorsCircumventionForWebUis", () => {
    it("replaces old session rules with origin-removing rules for each webui", async () => {
        (chrome.declarativeNetRequest.getSessionRules as any).mockResolvedValue([{ id: 7 }, { id: 8 }]);
        await registerCorsCircumventionForWebUis([
            webUi({ host: "a", port: 80 }),
            webUi({ host: "b", port: 80 }),
        ]);

        const arg = (chrome.declarativeNetRequest.updateSessionRules as any).mock.calls[0][0];
        expect(arg.removeRuleIds).toEqual([7, 8]);
        expect(arg.addRules).toHaveLength(2);
        expect(arg.addRules[0].action.requestHeaders[0]).toEqual({ header: "origin", operation: "remove" });
        expect(arg.addRules[0].condition.urlFilter).toBe("|http://a*");
    });

    it("skips webuis that produce an empty base url", async () => {
        const broken = webUi({ host: "x", port: 80 });
        vi.spyOn(broken, "createBaseUrl").mockReturnValue("");
        await registerCorsCircumventionForWebUis([broken]);
        const arg = (chrome.declarativeNetRequest.updateSessionRules as any).mock.calls[0][0];
        expect(arg.addRules).toHaveLength(0);
    });
});

describe("executeMethodWrappedWithReferer", () => {
    it("adds a referer rule, runs the method, then removes the rule", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as any).mockResolvedValue([]);
        const order: string[] = [];
        (chrome.declarativeNetRequest.updateDynamicRules as any).mockImplementation((arg: any) => {
            order.push(arg.addRules ? "add" : "remove");
            return Promise.resolve();
        });

        const method = vi.fn(async () => {
            order.push("method");
            return "result";
        });

        const result = await executeMethodWrappedWithReferer(method, "http://t/file", "http://t");
        expect(result).toBe("result");
        expect(order).toEqual(["add", "method", "remove"]);

        const addArg = (chrome.declarativeNetRequest.updateDynamicRules as any).mock.calls[0][0];
        expect(addArg.addRules[0].action.requestHeaders[0]).toEqual({
            header: "Referer",
            operation: "set",
            value: "http://t",
        });
    });

    it("removes the referer rule even when the method throws", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as any).mockResolvedValue([]);
        const failing = vi.fn(async () => {
            throw new Error("boom");
        });
        await expect(executeMethodWrappedWithReferer(failing, "http://t", "http://t")).rejects.toThrow("boom");
        // add + remove => two calls
        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(2);
    });

    it("allocates distinct rule ids for concurrent invocations", async () => {
        const addedIds: number[] = [];
        (chrome.declarativeNetRequest.updateDynamicRules as any).mockImplementation((arg: any) => {
            if (arg.addRules) {
                addedIds.push(arg.addRules[0].id);
            }
            return Promise.resolve();
        });

        await Promise.all([
            executeMethodWrappedWithReferer(async () => "a", "http://t/1", "http://t"),
            executeMethodWrappedWithReferer(async () => "b", "http://t/2", "http://t"),
        ]);

        expect(addedIds).toHaveLength(2);
        expect(addedIds[0]).not.toBe(addedIds[1]);
    });
});
