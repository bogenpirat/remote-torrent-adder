import { beforeEach, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createChromeMock } from "./helpers/chrome-mock";

// A fresh chrome mock, clean fetch stub and empty IndexedDB before every test,
// so listener registrations, stored settings and buffered torrents never bleed
// across test boundaries. A brand-new IDBFactory is how fake-indexeddb is reset:
// it drops every database the previous test created.
beforeEach(() => {
    (globalThis as any).chrome = createChromeMock();
    (globalThis as any).fetch = vi.fn();
    (globalThis as any).indexedDB = new IDBFactory();
});
