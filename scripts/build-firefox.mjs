/**
 * Produces a Firefox-compatible build of the extension.
 *
 * The compiled JavaScript is browser-agnostic (it uses the `chrome.*` namespace
 * which Firefox aliases, and branches on runtime feature detection), so the only
 * artifact that actually differs between the two targets is `manifest.json`.
 *
 * This script copies an existing Chromium build output and swaps in a manifest
 * transformed for Gecko:
 *   - background service worker -> background scripts (event page with DOM)
 *   - drop Chromium-only permissions (offscreen, webRequestAuthProvider)
 *   - add webRequestBlocking (Firefox keeps blocking webRequest in MV3)
 *   - add browser_specific_settings.gecko (id + minimum version)
 *
 * Usage: node scripts/build-firefox.mjs [sourceDistDir] [outDir]
 *   defaults: sourceDistDir = dist-prod, outDir = dist-firefox
 */
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const sourceDir = resolve(root, process.argv[2] ?? "dist-prod");
const outDir = resolve(root, process.argv[3] ?? "dist-firefox");

if (!existsSync(sourceDir)) {
    console.error(`Source build "${sourceDir}" not found. Run a build first (e.g. "npm run build:prod").`);
    process.exit(1);
}

// Start from a clean copy of the Chromium build output.
rmSync(outDir, { recursive: true, force: true });
cpSync(sourceDir, outDir, { recursive: true });

// Transform the manifest for Firefox. The Chromium manifest is the single
// source of truth so the two stay in sync automatically.
const manifest = JSON.parse(readFileSync(resolve(root, "src/manifest.json"), "utf8"));

// Firefox MV3 runs the background as a (DOM-capable) event page, not a worker.
manifest.background = {
    scripts: ["service_worker.js"]
};

// Swap Chromium-only permissions for their Firefox equivalents.
const dropPermissions = new Set(["offscreen", "webRequestAuthProvider"]);
manifest.permissions = manifest.permissions.filter(permission => !dropPermissions.has(permission));
// Firefox still supports blocking webRequest in MV3 (used for onAuthRequired).
if (!manifest.permissions.includes("webRequestBlocking")) {
    manifest.permissions.push("webRequestBlocking");
}

manifest.browser_specific_settings = {
    gecko: {
        id: "remote-torrent-adder@addons.mozilla.org",
        // declarativeNetRequest modifyHeaders, session rules and
        // action.openPopup() all require Firefox 128+.
        strict_min_version: "128.0",
        // The extension talks only to the user's own torrent clients; it does
        // not collect or transmit any user data to the developer.
        data_collection_permissions: {
            required: ["none"]
        }
    }
};

writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 4) + "\n");

// The offscreen document (the only thing under notifications/) is Chromium-only;
// remove it from the Firefox build.
rmSync(resolve(outDir, "notifications"), { recursive: true, force: true });

console.log(`Firefox build written to ${outDir}`);
