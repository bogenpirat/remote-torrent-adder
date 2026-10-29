#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { devDistDir, parseBrowser, prodDistDir } from './browsers.ts';

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

type Manifest = Record<string, unknown>;

export interface SourceManifest extends Manifest {
    name: string;
    permissions: string[];
    background: { service_worker: string };
    options_page: string;
}

export function buildManifest(base: SourceManifest, browser: string, { unlisted = false } = {}): Manifest {
    const manifest: Manifest = structuredClone(base);
    if (browser !== 'firefox') {
        return manifest;
    }

    manifest.background = { scripts: [base.background.service_worker] };
    manifest.permissions = base.permissions.filter(permission => !CHROME_ONLY_PERMISSIONS.has(permission));

    manifest.content_security_policy = { extension_pages: "script-src 'self'" };

    delete manifest.options_page;
    manifest.options_ui = { page: base.options_page, open_in_tab: true };

    manifest.browser_specific_settings = { gecko: unlisted ? GECKO_UNLISTED : GECKO };
    if (unlisted) {
        manifest.name = `${base.name} (self-hosted)`;
    }

    return manifest;
}

function main() {
    const browser = parseBrowser(process.argv[2]);
    const outDir = process.argv[3] ?? (process.env.PROD === 'true' ? prodDistDir(browser) : devDistDir(browser));
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
