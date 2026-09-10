#!/usr/bin/env node
import { access, cp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest, SOURCE_MANIFEST } from './generate-manifest.mjs';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDir = path.join(rootDir, 'dist-prod', 'firefox');
const outDir = path.join(rootDir, 'dist-prod', 'firefox-unlisted');

try {
    await access(sourceDir);
} catch {
    console.error(`Missing ${path.relative(rootDir, sourceDir)} — run "npm run build:firefox:prod:run" first.`);
    process.exit(1);
}

await rm(outDir, { recursive: true, force: true });
await cp(sourceDir, outDir, { recursive: true });

const base = JSON.parse(readFileSync(path.join(rootDir, SOURCE_MANIFEST), 'utf8'));
await writeFile(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(buildManifest(base, 'firefox', { unlisted: true }), null, 4) + '\n'
);
