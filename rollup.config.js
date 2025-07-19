import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
    input: [
        'src/service_worker.ts'
    ],
    output: {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true
    },
    plugins: [
        resolve(),
        commonjs(),
        typescript({ tsconfig: './tsconfig.json' }),
        copy({
            targets: [
                { src: 'src/**/*.{json,html,css,png,svg,ogg}', dest: 'dist' }
            ],
            flatten: false
        })
    ]
};
