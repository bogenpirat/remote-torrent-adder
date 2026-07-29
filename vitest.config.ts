import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        // Spies created with vi.spyOn are undone after each test, so call counts
        // cannot leak into the next one.
        restoreMocks: true,
        include: ["test/**/*.test.{ts,tsx}"],
        setupFiles: ["test/setup.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/**/*.d.ts",
                "src/service_worker.ts",
                "src/notifications/offscreen.ts",
            ],
            reporter: ["text", "html"],
        },
    },
});
