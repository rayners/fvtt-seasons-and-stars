import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { createSentryConfig } from '@rayners/foundry-dev-tools/sentry';
import packageJson from './packages/pf2e-pack/package.json' with { type: 'json' };

export default {
  input: 'src/pf2e-pack.ts',
  output: {
    file: '../../dist/pf2e-pack/pf2e-pack.js',
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
    copy({
      targets: [
        { src: 'module.json', dest: '../../dist/pf2e-pack' },
        { src: 'calendars', dest: '../../dist/pf2e-pack' },
        { src: 'README.md', dest: '../../dist/pf2e-pack' },
        { src: 'CHANGELOG.md', dest: '../../dist/pf2e-pack' },
        { src: '../../LICENSE', dest: '../../dist/pf2e-pack' },
      ],
    }),
    createSentryConfig('seasons-and-stars-pf2e', packageJson.version),
  ].filter(Boolean),
};
