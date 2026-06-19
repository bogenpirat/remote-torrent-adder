import { beforeEach, vi } from "vitest";
import { createChromeMock } from "./helpers/chrome-mock";

// A fresh chrome mock and clean fetch stub before every test, so listener
// registrations and stored settings never bleed across test boundaries.
beforeEach(() => {
    (globalThis as any).chrome = createChromeMock();
    (globalThis as any).fetch = vi.fn();
});
