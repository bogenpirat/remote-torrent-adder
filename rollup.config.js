import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

import terser from '@rollup/plugin-terser';

const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--configProd');
const distDir = isProd ? 'dist-prod' : 'dist';

export default {
    input: [
        'src/service_worker.ts'
    ],
    output: {
        dir: distDir,
        format: 'cjs',
        sourcemap: !isProd
    },
    plugins: [
        resolve({
            browser: true,
            preferBuiltins: false
        }),
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
};
