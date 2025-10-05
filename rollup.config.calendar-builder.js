import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
  input: './src/module.ts',
  output: {
    file: '../../dist/custom-calendar-builder/module.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({
      include: ['src/**/*'],
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        declaration: false,
        declarationMap: false,
      },
    }),
    copy({
      targets: [
        // Copy module.json
        {
          src: 'module.json',
          dest: '../../dist/custom-calendar-builder',
        },
        // Copy templates
        {
          src: 'templates/**/*',
          dest: '../../dist/custom-calendar-builder/templates',
        },
        // Copy languages
        {
          src: 'languages/**/*',
          dest: '../../dist/custom-calendar-builder/languages',
        },
        // Copy styles
        {
          src: 'styles/**/*',
          dest: '../../dist/custom-calendar-builder/styles',
        },
      ],
    }),
  ],
  external: [
    // Foundry VTT globals
    'foundry',
    'game',
    'ui',
    'CONFIG',
    'CONST',
    'Hooks',
    'canvas',
    'socket',
    // jQuery
    '$',
    'jQuery',
    // Other globals
    'console',
    'document',
    'window',
    'globalThis',
  ],
};
