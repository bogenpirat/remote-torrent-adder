import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createChromeMock } from "../helpers/chrome-mock";
import { GetLinkCatchingConfig, PreAddTorrentMessage } from "../../src/models/messages";
import { serializeObject } from "../../src/util/serializer";

describe("content-script click targets", () => {
    const RealMutationObserver = globalThis.MutationObserver;
    let observers: MutationObserver[];
    let browser: ReturnType<typeof createChromeMock>;
    let linkRegexes: RegExp[];

    beforeEach(() => {
        vi.resetModules();
        document.body.innerHTML = "";
        browser = createChromeMock();
        linkRegexes = [/\.torrent$/];
        vi.stubGlobal("chrome", browser);
        observers = [];
        vi.stubGlobal("MutationObserver", class extends RealMutationObserver {
            constructor(callback: MutationCallback) {
                super(callback);
                observers.push(this);
            }
        });
        browser.runtime.sendMessage.mockImplementation(async (message: { action: string }) => {
            if (message.action === GetLinkCatchingConfig.action) {
                return serializeObject({
                    linkCatchingEnabled: true,
                    linkCatchingRegexes: linkRegexes,
                });
            }
        });
    });

    afterEach(() => {
        observers.forEach(observer => observer.disconnect());
        vi.unstubAllGlobals();
    });

    async function start(html: string): Promise<void> {
        document.body.innerHTML = html;
        await import("../../src/content-script/rta");
        await vi.waitFor(() => expect(observers).toHaveLength(2));
        browser.runtime.sendMessage.mockClear();
    }

    function click(element: Element, init: MouseEventInit = {}): boolean {
        let intercepted = false;
        // Observe the extension's decision, then suppress jsdom navigation.
        element.addEventListener("click", event => {
            intercepted = event.defaultPrevented;
            event.preventDefault();
        }, { once: true });
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...init }));
        return intercepted;
    }

    it("sends the current href when a result row reuses its download anchor", async () => {
        await start('<a href="https://tracker.example/download/episode-1.torrent">Episode 1</a>');
        const link = document.querySelector("a")!;
        link.href = "https://tracker.example/download/episode-2.torrent";
        link.textContent = "Episode 2";

        expect(click(link)).toBe(true);
        expect(browser.runtime.sendMessage).toHaveBeenCalledExactlyOnceWith({
            action: PreAddTorrentMessage.action,
            url: link.href,
        });
    });

    it("does not duplicate interception when the same anchor is removed and reinserted", async () => {
        await start('<a href="https://tracker.example/original.torrent">Original</a>');
        const link = document.querySelector("a")!;
        link.remove();
        link.href = "https://tracker.example/replacement.torrent";
        document.body.appendChild(link);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(click(link)).toBe(true);
        expect(browser.runtime.sendMessage).toHaveBeenCalledExactlyOnceWith({
            action: PreAddTorrentMessage.action,
            url: link.href,
        });
    });

    it("matches and sends the resolved destination when a relative href changes", async () => {
        linkRegexes = [/^https:\/\/tracker\.example\/download\/.+\.torrent$/];
        await start('<base href="https://tracker.example/results/">' +
            '<a href="../download/first.torrent">First</a>');
        const link = document.querySelector("a")!;
        link.setAttribute("href", "../download/second.torrent");

        expect(click(link)).toBe(true);
        expect(browser.runtime.sendMessage).toHaveBeenCalledExactlyOnceWith({
            action: PreAddTorrentMessage.action,
            url: "https://tracker.example/download/second.torrent",
        });
    });

    it("uses a replacement magnet even when it does not match the torrent regex", async () => {
        await start('<a href="https://tracker.example/original.torrent">Original</a>');
        const link = document.querySelector("a")!;
        link.href = "magnet:?xt=urn:btih:0123456789012345678901234567890123456789";

        expect(click(link)).toBe(true);
        expect(browser.runtime.sendMessage).toHaveBeenCalledExactlyOnceWith({
            action: PreAddTorrentMessage.action,
            url: link.href,
        });
    });

    it("revalidates the current href on repeated clicks", async () => {
        await start('<a href="https://tracker.example/original.torrent">Original</a>');
        const link = document.querySelector("a")!;
        link.href = "https://tracker.example/replacement.torrent";

        expect(click(link)).toBe(true);
        expect(click(link)).toBe(true);
        expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(2);
        expect(browser.runtime.sendMessage).toHaveBeenLastCalledWith({
            action: PreAddTorrentMessage.action,
            url: link.href,
        });
    });

    it.each(["https://tracker.example/details/123", "", "   ", null])(
        "releases normal navigation after a bound href becomes %s",
        async href => {
            await start('<base href="https://tracker.example/page.torrent">' +
                '<a href="https://tracker.example/original.torrent">Original</a>');
            const link = document.querySelector("a")!;
            if (href === null) link.removeAttribute("href");
            else link.setAttribute("href", href);

            expect(click(link)).toBe(false);
            expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
        },
    );

    it.each(["ctrlKey", "shiftKey", "altKey"])("preserves the %s bypass", async modifier => {
        await start('<a href="https://tracker.example/original.torrent">Original</a>');
        const link = document.querySelector("a")!;
        link.href = "https://tracker.example/replacement.torrent";

        expect(click(link, { [modifier]: true })).toBe(false);
        expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it("sends the current action when a form changes without replacing its button", async () => {
        await start('<form action="https://tracker.example/original.torrent"><button>Download</button></form>');
        const form = document.querySelector("form")!;
        form.action = "https://tracker.example/replacement.torrent";

        expect(click(document.querySelector("button")!)).toBe(true);
        expect(browser.runtime.sendMessage).toHaveBeenCalledExactlyOnceWith({
            action: PreAddTorrentMessage.action,
            url: form.action,
        });
    });

    it("uses the current form when an existing button is reassigned", async () => {
        await start('<form id="first" action="https://tracker.example/first.torrent"></form>' +
            '<form id="second" action="https://tracker.example/second.torrent"></form>' +
            '<button form="first">Download</button>');
        const button = document.querySelector("button")!;
        button.setAttribute("form", "second");

        expect(click(button)).toBe(true);
        expect(browser.runtime.sendMessage).toHaveBeenCalledExactlyOnceWith({
            action: PreAddTorrentMessage.action,
            url: "https://tracker.example/second.torrent",
        });
    });

    it("does not send an old form action after the associated form is removed", async () => {
        await start('<form id="download" action="https://tracker.example/original.torrent"></form>' +
            '<button form="download">Download</button>');
        document.querySelector("form")!.remove();

        expect(click(document.querySelector("button")!)).toBe(false);
        expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
    });
});
