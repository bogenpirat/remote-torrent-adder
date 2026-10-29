#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { GECKO_UNLISTED, REPO_SLUG } from './generate-manifest.ts';

const rootDir = path.dirname(import.meta.dirname);

export const UPDATE_MANIFEST_PATH = path.join(rootDir, 'updates.json');

export function xpiAssetUrl(version: string) {
    return `https://github.com/${REPO_SLUG}/releases/download/v${version}/remote-torrent-adder-${version}.xpi`;
}

export function buildUpdateManifest(versions: string[]) {
    return {
        addons: {
            [GECKO_UNLISTED.id]: {
                updates: versions.map(version => ({ version, update_link: xpiAssetUrl(version) })),
            },
        },
    };
}

function main() {
    const version = process.argv[2]?.replace(/^v/, '');
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
        console.error(`Usage: node scripts/generate-update-manifest.ts <x.y.z> (got "${process.argv[2] ?? ''}")`);
        process.exit(1);
    }
    writeFileSync(UPDATE_MANIFEST_PATH, JSON.stringify(buildUpdateManifest([version]), null, 4) + '\n');
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
    main();
}
