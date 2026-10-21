import { test, expect } from "../../e2e/fixtures/extension";
import { defineClientSuite } from "./fixtures/client-suite";
import { qbittorrent } from "./fixtures/clients/qbittorrent";

test.describe("qBittorrent", () => {
    const suite = defineClientSuite(qbittorrent);

    test("force start bypasses the queue", async ({ extension, logs }) => {
        const state = await suite.addAndFind(extension, logs, { config: { clientSpecificSettings: { forceStart: true } } });
        expect(state.raw.force_start).toBe(true);
    });
});
