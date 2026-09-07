#!/usr/bin/env node
// Emits <distDir>/manifest.json for one browser target.
//
// src/manifest.json IS the Chrome manifest: it is the version source of truth
// that scripts/bump-version.mjs writes, and it is emitted verbatim for Chrome.
// The Firefox manifest is derived from it here rather than maintained as a
// second file, so a permission or content script added for Chrome cannot
// silently miss Firefox. test/build/manifest.test.ts asserts every delta.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { distDirFor, parseBrowser } from './browsers.mjs';

export const SOURCE_MANIFEST = 'src/manifest.json';

/** Permissions Firefox does not implement; listing one makes web-ext lint fail. */
const CHROME_ONLY_PERMISSIONS = new Set(['offscreen']);

/**
 * Identity on addons.mozilla.org. The id is permanent once the listing exists.
 * 149 is the first Firefox where action.openPopup() works without a user
 * gesture, which the link-catching popup flow depends on.
 */
export const GECKO = {
    id: 'remote-torrent-adder@bogenpirat',
    strict_min_version: '149.0',
    data_collection_permissions: { required: ['none'] },
};

/**
 * @param {Record<string, any>} base parsed src/manifest.json
 * @param {string} browser
 */
export function buildManifest(base, browser) {
    const manifest = structuredClone(base);
    if (browser !== 'firefox') {
        return manifest;
    }

    manifest.background = { scripts: [base.background.service_worker] };
    manifest.permissions = base.permissions.filter(permission => !CHROME_ONLY_PERMISSIONS.has(permission));

    delete manifest.options_page;
    manifest.options_ui = { page: base.options_page, open_in_tab: true };

    manifest.browser_specific_settings = { gecko: GECKO };

    return manifest;
}

function main() {
    const browser = parseBrowser(process.argv[2]);
    const outDir = process.argv[3] ?? distDirFor(browser, process.env.PROD === 'true');
    const base = JSON.parse(readFileSync(SOURCE_MANIFEST, 'utf8'));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
        path.join(outDir, 'manifest.json'),
        JSON.stringify(buildManifest(base, browser), null, 4) + '\n'
    );
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
    main();
}
