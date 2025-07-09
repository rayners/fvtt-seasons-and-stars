import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import scss from 'rollup-plugin-scss';
import { createSentryConfig } from '@rayners/foundry-dev-tools/sentry';
import packageJson from './package.json' with { type: 'json' };

export default {
  input: 'packages/core/src/module.ts',
  output: {
    file: 'dist/core/module.js',
    format: 'es',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  external: ['fs', 'path'],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      include: ['packages/core/src/**/*'],
    }),
    scss({
      fileName: 'styles/seasons-and-stars.css',
      outputStyle: 'compressed',
      watch: 'packages/core/src/styles',
      verbose: false,
    }),
    copy({
      targets: [
        { src: 'packages/core/module.json', dest: 'dist/core' },
        { src: 'packages/core/languages', dest: 'dist/core' },
        { src: 'packages/core/calendars', dest: 'dist/core' },
        { src: 'shared/schemas', dest: 'dist/core' },
        { src: 'packages/core/templates', dest: 'dist/core' },
        { src: 'README.md', dest: 'dist/core' },
        { src: 'CHANGELOG.md', dest: 'dist/core' },
        { src: 'LICENSE', dest: 'dist/core' },
      ],
    }),
    createSentryConfig('seasons-and-stars', packageJson.version),
  ].filter(Boolean),
};
