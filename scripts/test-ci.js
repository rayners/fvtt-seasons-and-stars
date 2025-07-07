#!/usr/bin/env node
/**
 * Minimal CI test runner that runs tests without complex dependencies
 */

import { spawn } from 'child_process';

function runTests() {
  console.log('🧪 Running tests with minimal CI setup...');

  const child = spawn('npx', ['vitest', 'run'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      CI: 'true',
      // Skip any optional rollup dependencies
      npm_config_optional: 'false',
    },
  });

  child.on('exit', code => {
    process.exit(code);
  });

  child.on('error', error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

runTests();
