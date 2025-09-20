import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import scss from 'rollup-plugin-scss';
import { createSentryConfig } from '@rayners/foundry-dev-tools/sentry';
import packageJson from './package.json' with { type: 'json' };

export default {
  input: 'src/module.ts',
  output: {
    file: '../../dist/core/module.js',
    format: 'es',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  external: ['fs', 'path'],
  plugins: [
    typescript({
      tsconfig: '../../tsconfig.json',
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
      fileName: 'styles/seasons-and-stars.css',
      outputStyle: 'compressed',
      watch: 'src/styles',
      verbose: false,
    }),
    copy({
      targets: [
        { src: 'module.json', dest: '../../dist/core' },
        { src: 'languages', dest: '../../dist/core' },
        { src: 'calendars', dest: '../../dist/core' },
        { src: '../../shared/schemas', dest: '../../dist/core' },
        { src: 'templates', dest: '../../dist/core' },
        { src: '../../README.md', dest: '../../dist/core' },
        { src: '../../CHANGELOG.md', dest: '../../dist/core' },
        { src: '../../LICENSE', dest: '../../dist/core' },
      ],
    }),
    createSentryConfig('seasons-and-stars', packageJson.version),
  ].filter(Boolean),
};
