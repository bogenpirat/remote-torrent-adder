#!/usr/bin/env node
import { cp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { distDirFor, parseBrowser, targetsFor } from './browsers.mjs';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

const argv = process.argv.slice(2);
const flag = name => argv.find(arg => arg.startsWith(`--${name}=`))?.split('=')[1];

const browser = parseBrowser(flag('browser') ?? process.env.RTA_BROWSER);
const isProd = argv.includes('--prod') || process.env.PROD === 'true';
const watch = argv.includes('--watch');
const only = flag('only');
const distDir = path.join(rootDir, distDirFor(browser, isProd));
const env = { ...process.env, RTA_BROWSER: browser, PROD: String(isProd) };

function run(args, extraEnv) {
    const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: rootDir, env: { ...env, ...extraEnv } });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

if (!only) {
    await rm(distDir, { recursive: true, force: true });
}

if (!only || only === 'assets') {
    await cp(path.join(rootDir, 'src', 'assets'), path.join(distDir, 'assets'), { recursive: true });
    run([path.join(rootDir, 'scripts', 'generate-manifest.mjs'), browser, distDir]);
}

for (const target of targetsFor(browser)) {
    if (only && only !== target) {
        continue;
    }
    run([viteBin, 'build', ...(watch ? ['--watch'] : [])], { RTA_TARGET: target });
}
