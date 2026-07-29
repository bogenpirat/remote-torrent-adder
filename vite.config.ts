import { defineConfig, type Plugin, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.PROD === 'true';
const distDir = isProd ? 'dist-prod' : 'dist';

// Chrome serves extension pages from chrome-extension://, where the crossorigin
// attribute Vite emits on module scripts buys nothing and trips some CSPs.
const removeCrossOrigin: Plugin = {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
        return html.replace(/ crossorigin(=["'][^"']*["'])?/g, '');
    },
};

/** An extension page: an HTML entry processed by Vite with React. */
function pageTarget(name: string, entryHtml: string): UserConfig {
    return {
        root: path.resolve(rootDir, 'src', name),
        base: './',
        plugins: [react(), removeCrossOrigin],
        resolve: {
            alias: { '@': path.resolve(rootDir, 'src', name) },
        },
        build: {
            outDir: path.resolve(rootDir, distDir, name),
            emptyOutDir: true,
            sourcemap: !isProd,
            minify: isProd,
            rolldownOptions: {
                input: path.resolve(rootDir, 'src', name, entryHtml),
            },
        },
    };
}

/**
 * A classic script: the service worker and the content script both have to be
 * single self-contained files, so they are built as IIFE bundles rather than as
 * ES modules with shared chunks.
 */
function scriptTarget(entry: string, globalName: string, outSubDir: string, fileName: string): UserConfig {
    return {
        root: rootDir,
        build: {
            outDir: path.resolve(rootDir, distDir, outSubDir),
            emptyOutDir: false,
            sourcemap: !isProd,
            minify: isProd,
            lib: {
                entry: path.resolve(rootDir, entry),
                formats: ['iife'],
                name: globalName,
                fileName: () => fileName,
            },
        },
    };
}

const targets: Record<string, UserConfig> = {
    popup: pageTarget('popup', 'popup.html'),
    options: pageTarget('options', 'options.html'),
    notifications: pageTarget('notifications', 'offscreen.html'),
    worker: scriptTarget('src/service_worker.ts', 'RTAServiceWorker', '.', 'service_worker.js'),
    'content-script': scriptTarget('src/content-script/rta.ts', 'RTAContentScript', 'content-script', 'rta.js'),
};

export default defineConfig(() => {
    const target = process.env.RTA_TARGET;
    if (!target || !(target in targets)) {
        throw new Error(`Set RTA_TARGET to one of: ${Object.keys(targets).join(', ')} (got ${target ?? 'nothing'})`);
    }
    return targets[target];
});
