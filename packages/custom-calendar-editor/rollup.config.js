import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import scss from 'rollup-plugin-scss';

export default {
  input: 'src/module.ts',
  output: {
    file: '../../dist/custom-calendar-editor/module.js',
    format: 'es',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  external: ['fs', 'path'],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      include: ['src/**/*'],
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
      },
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    json(),
    scss({
      fileName: 'styles/custom-calendar-editor.css',
      outputStyle: 'compressed',
      watch: 'styles',
      verbose: false,
    }),
    copy({
      targets: [
        { src: 'module.json', dest: '../../dist/custom-calendar-editor' },
        { src: 'lang', dest: '../../dist/custom-calendar-editor' },
        { src: 'templates', dest: '../../dist/custom-calendar-editor' },
        { src: '../../LICENSE', dest: '../../dist/custom-calendar-editor' },
      ],
    }),
  ].filter(Boolean),
};
