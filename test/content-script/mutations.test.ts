import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { observe } from "../../src/content-script/mutations";

describe("observe", () => {
    // `observe` never disconnects its MutationObserver; capture every instance
    // so we can tear them down and avoid callbacks firing after the test ends.
    const RealMutationObserver = globalThis.MutationObserver;
    let observers: MutationObserver[];

    beforeEach(() => {
        document.body.innerHTML = "";
        observers = [];
        globalThis.MutationObserver = class extends RealMutationObserver {
            constructor(callback: MutationCallback) {
                super(callback);
                observers.push(this);
            }
        };
    });

    afterEach(() => {
        observers.forEach((o) => o.disconnect());
        globalThis.MutationObserver = RealMutationObserver;
        vi.restoreAllMocks();
    });

    it("invokes the callback for elements already present", () => {
        document.body.innerHTML = `<a class="x"></a><a class="x"></a><span></span>`;
        const callback = vi.fn();
        observe("a.x", callback);
        expect(callback).toHaveBeenCalledTimes(2);
    });

    it("does not invoke the callback twice for the same element", () => {
        document.body.innerHTML = `<a class="x"></a>`;
        const callback = vi.fn();
        observe("a.x", callback);
        observe("a.x", callback); // second observe sees __bound and skips
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("invokes the callback for elements added later", async () => {
        const callback = vi.fn();
        observe("a.late", callback);
        expect(callback).not.toHaveBeenCalled();

        const link = document.createElement("a");
        link.className = "late";
        document.body.appendChild(link);

        // MutationObserver callbacks are delivered as microtasks
        await new Promise((r) => setTimeout(r, 0));
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(link);
    });

    it("invokes the callback for matching descendants of an added subtree", async () => {
        const callback = vi.fn();
        observe("a.deep", callback);

        const container = document.createElement("div");
        container.innerHTML = `<span><a class="deep"></a></span>`;
        document.body.appendChild(container);

        await new Promise((r) => setTimeout(r, 0));
        expect(callback).toHaveBeenCalledTimes(1);
    });
});
