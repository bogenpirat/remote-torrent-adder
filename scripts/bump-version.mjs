#!/usr/bin/env node
// Sets the extension version across every file that carries it.
//
// Usage:
//   node scripts/bump-version.mjs 2.0.6   # set an explicit version (v-prefix ok)
//   node scripts/bump-version.mjs         # increment the patch from the manifest
//
// `src/manifest.json` is the source of truth (it is what the Chrome Web Store
// reads). `package.json` and `package-lock.json` are kept in sync for hygiene.
// Prints the resulting version to stdout so callers (CI) can capture it.

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const manifestPath = 'src/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function parse(version) {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        throw new Error(`Invalid version "${version}" (expected x.y.z)`);
    }
    return parts;
}

const arg = process.argv[2];
let newVersion;
if (arg) {
    newVersion = arg.replace(/^v/, '');
    parse(newVersion); // validate format
} else {
    const [major, minor, patch] = parse(manifest.version);
    newVersion = `${major}.${minor}.${patch + 1}`;
}

manifest.version = newVersion;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');

// Sync package.json + package-lock.json. Suppress npm's own stdout so the only
// thing this script writes to stdout is the new version number.
execSync(`npm version ${newVersion} --no-git-tag-version --allow-same-version`, {
    stdio: ['ignore', 'ignore', 'inherit'],
});

console.log(newVersion);
