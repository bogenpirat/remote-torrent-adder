import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
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
