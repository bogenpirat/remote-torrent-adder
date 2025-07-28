import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

import terser from '@rollup/plugin-terser';

const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--configProd');
const distDir = isProd ? 'dist-prod' : 'dist';

export default [
    {
        input: 'src/service_worker.ts',
        output: {
            dir: distDir,
            format: 'iife',
            name: 'RTAServiceWorker',
            sourcemap: !isProd,
            entryFileNames: 'service_worker.js'
        },
        plugins: [
            resolve({ browser: true, preferBuiltins: false }),
            commonjs(),
            typescript({ tsconfig: './tsconfig.json' }),
            ...(isProd ? [terser()] : [])
        ]
    },
    {
        input: 'src/content-script/rta.ts',
        output: {
            dir: `${distDir}/content-script`,
            format: 'iife',
            name: 'RTAContentScript',
            sourcemap: !isProd,
            entryFileNames: 'rta.js'
        },
        plugins: [
            resolve({ browser: true, preferBuiltins: false }),
            commonjs(),
            typescript({ tsconfig: './tsconfig.json' }),
            copy({
                targets: [
                    { src: 'src/**/*.{json,html,css,png,svg,ogg}', dest: distDir }
                ],
                flatten: false
            }),
            ...(isProd ? [terser()] : [])
        ]
    },
    {
        input: 'src/popup/popup.ts',
        output: {
            dir: `${distDir}/popup`,
            format: 'iife',
            name: 'RTAPopupScript',
            sourcemap: !isProd,
            entryFileNames: 'popup.js'
        },
        plugins: [
            resolve({ browser: true, preferBuiltins: false }),
            commonjs(),
            typescript({ tsconfig: './tsconfig.json' }),
            copy({
                targets: [
                    { src: 'src/**/*.{json,html,css,png,svg,ogg}', dest: distDir }
                ],
                flatten: false
            }),
            ...(isProd ? [terser()] : [])
        ]
    }
];
