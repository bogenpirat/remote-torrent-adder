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
            constructor(cb: MutationCallback) {
                super(cb);
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
        const cb = vi.fn();
        observe("a.x", cb);
        expect(cb).toHaveBeenCalledTimes(2);
    });

    it("does not invoke the callback twice for the same element", () => {
        document.body.innerHTML = `<a class="x"></a>`;
        const cb = vi.fn();
        observe("a.x", cb);
        observe("a.x", cb); // second observe sees __bound and skips
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it("invokes the callback for elements added later", async () => {
        const cb = vi.fn();
        observe("a.late", cb);
        expect(cb).not.toHaveBeenCalled();

        const link = document.createElement("a");
        link.className = "late";
        document.body.appendChild(link);

        // MutationObserver callbacks are delivered as microtasks
        await new Promise((r) => setTimeout(r, 0));
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledWith(link);
    });

    it("invokes the callback for matching descendants of an added subtree", async () => {
        const cb = vi.fn();
        observe("a.deep", cb);

        const container = document.createElement("div");
        container.innerHTML = `<span><a class="deep"></a></span>`;
        document.body.appendChild(container);

        await new Promise((r) => setTimeout(r, 0));
        expect(cb).toHaveBeenCalledTimes(1);
    });
});
