import { test, expect } from "./fixtures/extension";
import { makeSettings } from "./fixtures/settings";
import { StaticSite } from "./fixtures/static-site";

let site: StaticSite;

test.beforeEach(async () => {
    site = new StaticSite();
    await site.start();
});

test.afterEach(async () => {
    await site.stop();
});

test.describe("content script", () => {
    test("catches torrent and magnet links on a real page", async ({ extension, logs }) => {
        await extension.openPage(site.baseUrl + "/");

        const links = await extension.pageLinks(`${site.baseUrl}/*`);
        const urls = links.map(link => link.url);

        expect(urls).toContain(`${site.baseUrl}/files/sample.torrent`);
        expect(urls.some(url => url.startsWith("magnet:"))).toBe(true);
        expect(urls, "a plain .txt link must not be caught").not.toContain(`${site.baseUrl}/files/readme.txt`);

        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });

    test("catches nothing when link catching is turned off", async ({ extension, logs }) => {
        await extension.seedSettings(makeSettings([], { linkCatchingEnabled: false }));

        await extension.openPage(site.baseUrl + "/");

        expect(await extension.pageLinks(`${site.baseUrl}/*`)).toEqual([]);

        await logs.waitForQuiet();
        const problems = logs.unexpectedProblems();
        expect(problems, logs.report(problems)).toEqual([]);
    });
});
