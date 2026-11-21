#!/usr/bin/env node
import { watch as fsWatch } from 'node:fs';
import { cp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { BROWSERS, devDistDir, parseBrowser, prodDistDir, targetsFor } from './browsers.ts';

const rootDir = path.dirname(import.meta.dirname);
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const WATCHED_TARGETS = ['assets', 'worker', 'content-script'];

const argv = process.argv.slice(2);
const flag = (name: string) => argv.find(arg => arg.startsWith(`--${name}=`))?.split('=')[1];

const browser = parseBrowser(flag('browser') ?? process.env.RTA_BROWSER);
const isProd = argv.includes('--prod') || process.env.PROD === 'true';
const watch = argv.includes('--watch');
const only = flag('only');
const watchAssets = watch && only === 'assets';
const distDir = path.join(rootDir, isProd ? prodDistDir(browser) : devDistDir(browser));
const env = { ...process.env, RTA_BROWSER: browser, PROD: String(isProd) };

function run(args: string[], extraEnv?: Record<string, string>) {
    const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: rootDir, env: { ...env, ...extraEnv } });
    if (result.status !== 0 && !watchAssets) {
        process.exit(result.status ?? 1);
    }
}

const currentModeFlags = isProd ? ['--prod'] : [];

function selfArgs(forBrowser: string, modeFlags: string[]) {
    return [import.meta.filename, `--browser=${forBrowser}`, ...modeFlags];
}

function buildEverything() {
    for (const eachBrowser of BROWSERS) {
        for (const modeFlags of [[], ['--prod']]) {
            run(selfArgs(eachBrowser, modeFlags), { RTA_BROWSER: eachBrowser, PROD: 'false' });
        }
    }
    run([path.join(rootDir, 'scripts', 'build-unlisted.ts')]);
}

function buildThenWatch() {
    run(selfArgs(browser, currentModeFlags));
    for (const target of WATCHED_TARGETS) {
        spawn(process.execPath, [...selfArgs(browser, currentModeFlags), `--only=${target}`, '--watch'], {
            stdio: 'inherit',
            cwd: rootDir,
            env,
        });
    }
}

async function buildAssets() {
    await cp(path.join(rootDir, 'src', 'assets'), path.join(distDir, 'assets'), { recursive: true });
    run([path.join(rootDir, 'scripts', 'generate-manifest.ts'), browser, distDir]);
}

function watchAssetSources() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const rebuild = () => {
        clearTimeout(timer);
        timer = setTimeout(() => buildAssets().catch(error => console.error(error)), 100);
    };
    fsWatch(path.join(rootDir, 'src', 'assets'), { recursive: true }, rebuild);
    fsWatch(path.join(rootDir, 'src'), (_event, filename) => {
        if (filename === 'manifest.json') {
            rebuild();
        }
    });
}

async function buildTargets() {
    if (!only) {
        await rm(distDir, { recursive: true, force: true });
    }
    if (!only || only === 'assets') {
        await buildAssets();
    }
    if (watchAssets) {
        watchAssetSources();
    }
    for (const target of targetsFor(browser)) {
        if (only && only !== target) {
            continue;
        }
        run([viteBin, 'build', ...(watch ? ['--watch'] : [])], { RTA_TARGET: target });
    }
}

if (argv.includes('--all')) {
    buildEverything();
} else if (watch && !only) {
    buildThenWatch();
} else {
    await buildTargets();
}
