import { type Worker } from "@playwright/test";
import {
    readContextMenuIds,
    readNotifications,
    recordContextMenuIds,
    recordNotifications,
    type RaisedNotification,
} from "./worker-scripts";

/**
 * Observes what the service worker does through APIs Chrome offers no way to
 * read back. The worker is looked up on every call because a browser restart
 * replaces it.
 */
export class WorkerRecorder {
    constructor(private readonly currentWorker: () => Worker) {}

    /** Records the context menu ids from this point on; a rebuild has to be provoked to see any. */
    async watchContextMenus(): Promise<void> {
        await this.currentWorker().evaluate(recordContextMenuIds);
    }

    contextMenuIds(): Promise<string[]> {
        return this.currentWorker().evaluate(readContextMenuIds);
    }

    /** Records every notification the worker raises from this point on. */
    async watchNotifications(): Promise<void> {
        await this.currentWorker().evaluate(recordNotifications);
    }

    notifications(): Promise<RaisedNotification[]> {
        return this.currentWorker().evaluate(readNotifications);
    }
}
