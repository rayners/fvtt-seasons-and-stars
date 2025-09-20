import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

export default {
  input: 'packages/test-module/src/test-module.ts',
  output: {
    file: 'dist/test-module/module.js',
    format: 'es',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  external: ['fs', 'path'],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      include: ['packages/test-module/src/**/*'],
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
    copy({
      targets: [
        { src: 'packages/test-module/module.json', dest: 'dist/test-module' },
        { src: 'packages/test-module/calendars', dest: 'dist/test-module' },
        { src: 'packages/test-module/templates', dest: 'dist/test-module' },
        { src: 'README.md', dest: 'dist/test-module' },
        { src: 'LICENSE', dest: 'dist/test-module' },
      ],
    }),
  ].filter(Boolean),
};
