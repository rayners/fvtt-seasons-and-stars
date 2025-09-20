import packageJson from './package.json' with { type: 'json' };

export default async () => {
  process.env.ROLLUP_SKIP_NODE_JS_NATIVE ??= '1';
  process.env.ROLLUP_DISABLE_BUNDLE_CACHE ??= '1';

  const [
    { default: resolve },
    { default: commonjs },
    { default: json },
    { default: typescript },
    { default: copy },
    { default: scss },
    { createSentryConfig },
  ] = await Promise.all([
    import('@rollup/plugin-node-resolve'),
    import('@rollup/plugin-commonjs'),
    import('@rollup/plugin-json'),
    import('@rollup/plugin-typescript'),
    import('rollup-plugin-copy'),
    import('rollup-plugin-scss'),
    import('@rayners/foundry-dev-tools/sentry'),
  ]);

  return {
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
};
