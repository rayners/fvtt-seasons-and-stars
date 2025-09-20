import packageJson from './packages/pf2e-pack/package.json' with { type: 'json' };

export default async () => {
  process.env.ROLLUP_SKIP_NODE_JS_NATIVE ??= '1';
  process.env.ROLLUP_DISABLE_BUNDLE_CACHE ??= '1';

  const [
    { default: resolve },
    { default: commonjs },
    { default: json },
    { default: typescript },
    { default: copy },
    { createSentryConfig },
  ] = await Promise.all([
    import('@rollup/plugin-node-resolve'),
    import('@rollup/plugin-commonjs'),
    import('@rollup/plugin-json'),
    import('@rollup/plugin-typescript'),
    import('rollup-plugin-copy'),
    import('@rayners/foundry-dev-tools/sentry'),
  ]);

  return {
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
};
