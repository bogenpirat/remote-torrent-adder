import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
    showNotification: vi.fn(),
    downloadTorrent: vi.fn(),
}));

vi.mock("../../src/util/notifications", () => ({ showNotification: mocks.showNotification }));
vi.mock("../../src/util/download", async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    downloadTorrent: mocks.downloadTorrent,
}));

export const showNotification = mocks.showNotification;
export const downloadTorrent = mocks.downloadTorrent;
