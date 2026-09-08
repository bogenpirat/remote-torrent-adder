#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { distDirFor, parseBrowser } from './browsers.mjs';

export const SOURCE_MANIFEST = 'src/manifest.json';

const CHROME_ONLY_PERMISSIONS = new Set(['offscreen']);

export const REPO_SLUG = 'bogenpirat/remote-torrent-adder';
export const UPDATE_MANIFEST_URL = `https://raw.githubusercontent.com/${REPO_SLUG}/master/updates.json`;

export const GECKO = {
    id: 'remote-torrent-adder@bogenpirat',
    strict_min_version: '149.0',
    data_collection_permissions: { required: ['none'] },
};

export const GECKO_UNLISTED = {
    ...GECKO,
    id: 'remote-torrent-adder-selfhosted@bogenpirat',
    update_url: UPDATE_MANIFEST_URL,
};

/**
 * @param {Record<string, any>} base
 * @param {string} browser
 * @param {{ unlisted?: boolean }} [options]
 */
export function buildManifest(base, browser, { unlisted = false } = {}) {
    const manifest = structuredClone(base);
    if (browser !== 'firefox') {
        return manifest;
    }

    manifest.background = { scripts: [base.background.service_worker] };
    manifest.permissions = base.permissions.filter(permission => !CHROME_ONLY_PERMISSIONS.has(permission));

    delete manifest.options_page;
    manifest.options_ui = { page: base.options_page, open_in_tab: true };

    manifest.browser_specific_settings = { gecko: unlisted ? GECKO_UNLISTED : GECKO };
    if (unlisted) {
        manifest.name = `${base.name} (self-hosted)`;
    }

    return manifest;
}

function main() {
    const args = process.argv.slice(2);
    const unlisted = args.includes('--unlisted');
    const positional = args.filter(arg => !arg.startsWith('--'));
    const browser = parseBrowser(positional[0]);
    const outDir = positional[1] ?? distDirFor(browser, process.env.PROD === 'true');
    const base = JSON.parse(readFileSync(SOURCE_MANIFEST, 'utf8'));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
        path.join(outDir, 'manifest.json'),
        JSON.stringify(buildManifest(base, browser, { unlisted }), null, 4) + '\n'
    );
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
    main();
}
