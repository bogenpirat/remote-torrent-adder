import { test, expect } from "../fixtures/firefox-extension";

test.describe("notifications on firefox", () => {
    test("firefox still rejects notification buttons, so the add-label button stays chrome-only", async ({ extension }) => {
        const outcome = extension.evaluate<string>(
            [
                "return await browser.notifications.create('', {",
                "    type: 'basic',",
                "    iconUrl: 'assets/icons/BitTorrent128.png',",
                "    title: 'Torrent added successfully',",
                "    message: 'e2e',",
                "    buttons: [{ title: 'Add label' }],",
                "});",
            ].join("\n"),
        );

        await expect(outcome).rejects.toThrow(/"buttons" is unsupported by Firefox/);
    });
});
