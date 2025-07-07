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
    file: 'dist/module.js',
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
    typescript(),
    scss({
      fileName: 'styles/seasons-and-stars.css',
      outputStyle: 'compressed',
      watch: 'src/styles',
      verbose: false, // Reduce log noise
    }),
    copy({
      targets: [
        { src: 'module.json', dest: 'dist' },
        { src: 'languages', dest: 'dist' },
        { src: 'calendars', dest: 'dist' },
        { src: 'schemas', dest: 'dist' },
        { src: 'templates', dest: 'dist' },
        { src: 'README.md', dest: 'dist' },
        { src: 'CHANGELOG.md', dest: 'dist' },
        { src: 'LICENSE', dest: 'dist' },
      ],
    }),
    createSentryConfig('seasons-and-stars', packageJson.version),
  ].filter(Boolean), // Remove null plugins (Sentry disabled in non-CI)
};
