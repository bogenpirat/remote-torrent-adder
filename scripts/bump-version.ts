#!/usr/bin/env node
// Sets the extension version across every file that carries it.
//
// Usage:
//   node scripts/bump-version.ts 2.0.6   # set an explicit version (v-prefix ok)
//   node scripts/bump-version.ts         # increment the patch from the manifest
//
// `src/manifest.json` is the source of truth (it is what the Chrome Web Store
// reads). `package.json` is kept in sync for hygiene.
// Prints the resulting version to stdout so callers (CI) can capture it.

import { readFileSync, writeFileSync } from 'node:fs';

const manifestPath = 'src/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function parse(version: string) {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        throw new Error(`Invalid version "${version}" (expected x.y.z)`);
    }
    return parts as [number, number, number];
}

const arg = process.argv[2];
let newVersion: string;
if (arg) {
    newVersion = arg.replace(/^v/, '');
    parse(newVersion); // validate format
} else {
    const [major, minor, patch] = parse(manifest.version);
    newVersion = `${major}.${minor}.${patch + 1}`;
}

manifest.version = newVersion;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');

const packagePath = 'package.json';
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
pkg.version = newVersion;
writeFileSync(packagePath, JSON.stringify(pkg, null, 4) + '\n');

console.log(newVersion);
