import { afterEach, beforeEach, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
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

// Unmount anything a component test rendered, so the next test starts on an
// empty document and queries cannot match a leftover tree.
afterEach(() => {
    cleanup();
});
