import type { BrowserContext, ConsoleMessage, Page, Worker } from "@playwright/test";

export interface LogEntry {
    surface: string;
    type: string;
    text: string;
}

/**
 * Messages the extension emits during perfectly normal operation. Every entry
 * needs a source reference so it stays auditable; anything not listed here that
 * arrives as a warning is treated as a failure.
 */
const BENIGN_WARNINGS: RegExp[] = [
    // src/content-script/rta.ts - a cold service worker is expected on first load
    /Service worker might've been asleep/,
    // src/util/download.ts - the normal fallback when no content script answers
    /No content script answered in tab/,
    /The page could not download the torrent/,
    // src/util/action.ts, src/util/context-menu.ts - expected with empty settings
    /Action icon clicked, but no WebUI is configured/,
    /Context menu clicked, but no matching WebUI is configured/,
];

/**
 * Warnings that Chrome itself emits and that always indicate a real defect in
 * the extension, so they are promoted to failures.
 */
const FATAL_WARNINGS: RegExp[] = [
    /Unchecked runtime\.lastError/,
];

export class ConsoleCollector {
    readonly entries: LogEntry[] = [];
    private lastEventAt = Date.now();

    attach(context: BrowserContext): void {
        for (const worker of context.serviceWorkers()) {
            this.attachWorker(worker);
        }
        for (const page of context.pages()) {
            this.attachPage(page);
        }
        context.on("serviceworker", worker => this.attachWorker(worker));
        context.on("page", page => this.attachPage(page));
    }

    attachWorker(worker: Worker): void {
        const surface = "service-worker";
        worker.on("console", message => this.record(surface, message));
        void worker
            .evaluate(() => {
                const scope = self as unknown as { __rtaE2eHooked?: boolean };
                if (scope.__rtaE2eHooked) {
                    return;
                }
                scope.__rtaE2eHooked = true;
                self.addEventListener("error", event => {
                    console.error("[e2e:uncaught]", (event as ErrorEvent).message);
                });
                self.addEventListener("unhandledrejection", event => {
                    console.error("[e2e:unhandledrejection]", String((event as PromiseRejectionEvent).reason));
                });
            })
            .catch(() => undefined);
    }

    attachPage(page: Page): void {
        const surface = pageSurface(page.url());
        page.on("console", message => this.record(surface || pageSurface(page.url()), message));
        page.on("pageerror", error => this.push({
            surface: surface || pageSurface(page.url()),
            type: "pageerror",
            text: error.message,
        }));
    }

    /**
     * Resolves once no console event has arrived for `quietMs`, never sooner
     * than `quietMs` after the call - output the surface has not emitted yet
     * must not be mistaken for output that has already settled.
     */
    async waitForQuiet({ quietMs = 750, timeoutMs = 20_000 }: { quietMs?: number; timeoutMs?: number } = {}): Promise<void> {
        const start = Date.now();
        const deadline = start + timeoutMs;
        while (Date.now() < deadline) {
            const idleSince = Math.max(this.lastEventAt, start);
            const idleFor = Date.now() - idleSince;
            if (idleFor >= quietMs) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, Math.max(25, quietMs - idleFor)));
        }
    }

    /** Every entry that should fail a test unless a spec explicitly expects it. */
    problems(): LogEntry[] {
        return this.entries.filter(entry => {
            if (entry.type === "pageerror" || entry.type === "error") {
                return true;
            }
            if (entry.type !== "warning") {
                return false;
            }
            return FATAL_WARNINGS.some(pattern => pattern.test(entry.text))
                || !BENIGN_WARNINGS.some(pattern => pattern.test(entry.text));
        });
    }

    /**
     * Returns the problems left after removing the ones a spec knowingly
     * expects, and asserts each expectation actually occurred.
     */
    unexpectedProblems(expected: RegExp[] = []): LogEntry[] {
        const problems = this.problems();
        const unmatched = expected.filter(pattern => !problems.some(entry => pattern.test(entry.text)));
        if (unmatched.length) {
            throw new Error(`Expected these messages but none arrived: ${unmatched.map(String).join(", ")}`);
        }
        return problems.filter(entry => !expected.some(pattern => pattern.test(entry.text)));
    }

    report(entries: LogEntry[] = this.entries): string {
        if (!entries.length) {
            return "(no console output)";
        }
        return entries.map(entry => `  [${entry.surface}] ${entry.type}: ${entry.text}`).join("\n");
    }

    clear(): void {
        this.entries.length = 0;
    }

    private record(surface: string, message: ConsoleMessage): void {
        this.push({ surface, type: message.type(), text: message.text() });
    }

    private push(entry: LogEntry): void {
        this.lastEventAt = Date.now();
        this.entries.push(entry);
    }
}

function pageSurface(url: string): string {
    if (url.includes("/options/")) return "options";
    if (url.includes("/popup/")) return "popup";
    if (url.includes("/notifications/")) return "offscreen";
    if (url.startsWith("chrome-extension://")) return "extension-page";
    return "page";
}
