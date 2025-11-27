import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { createSentryConfig } from '@rayners/foundry-dev-tools/sentry';
import packageJson from './packages/dnd5e-pack/package.json' with { type: 'json' };

export default {
  input: 'src/dnd5e-pack.ts',
  output: {
    file: '../../dist/dnd5e-pack/dnd5e-pack.js',
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
        { src: 'module.json', dest: '../../dist/dnd5e-pack' },
        { src: 'README.md', dest: '../../dist/dnd5e-pack' },
        { src: 'CHANGELOG.md', dest: '../../dist/dnd5e-pack' },
        { src: '../../LICENSE', dest: '../../dist/dnd5e-pack' },
      ],
    }),
    createSentryConfig('seasons-and-stars-dnd5e', packageJson.version),
  ].filter(Boolean),
};
