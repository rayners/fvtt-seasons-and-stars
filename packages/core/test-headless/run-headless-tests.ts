#!/usr/bin/env tsx

/**
 * Test runner for headless Foundry tests
 *
 * This script runs Playwright tests against a real FoundryVTT instance
 * to validate Seasons & Stars functionality across different game systems
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestRunOptions {
  config?: string;
  project?: string;
  headed?: boolean;
  debug?: boolean;
  trace?: boolean;
  update?: boolean;
  reporters?: string[];
}

class HeadlessTestRunner {
  private foundryUrl = 'http://localhost:30000';
  private configPath: string;

  constructor() {
    this.configPath = join(__dirname, 'headless-test.config.ts');
  }

  async checkFoundryAvailability(): Promise<boolean> {
    try {
      const response = await fetch(this.foundryUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error(`❌ Foundry not available at ${this.foundryUrl}`);
      console.error(`   Please ensure Foundry is running with the test worlds configured`);
      return false;
    }
  }

  async runTests(options: TestRunOptions = {}): Promise<boolean> {
    // Check Foundry availability first
    if (!(await this.checkFoundryAvailability())) {
      console.error(`\n🚫 Cannot run headless tests - Foundry server is not responding`);
      console.error(`   Start your Foundry server at ${this.foundryUrl} first`);
      return false;
    }

    console.log(`✅ Foundry server is available at ${this.foundryUrl}`);
    console.log(`🎮 Starting headless tests for Seasons & Stars module...\n`);

    // Build Playwright command
    const cmd = 'npx';
    const args = ['playwright', 'test'];

    // Add configuration
    if (options.config) {
      args.push('--config', options.config);
    } else if (existsSync(this.configPath)) {
      args.push('--config', this.configPath);
    }

    // Add project filter
    if (options.project) {
      args.push('--project', options.project);
    }

    // Add debug/headed mode
    if (options.headed) {
      args.push('--headed');
    }
    if (options.debug) {
      args.push('--debug');
    }
    if (options.trace) {
      args.push('--trace', 'on');
    }
    if (options.update) {
      args.push('--update-snapshots');
    }

    // Add reporters
    if (options.reporters && options.reporters.length > 0) {
      options.reporters.forEach(reporter => {
        args.push('--reporter', reporter);
      });
    }

    return new Promise(resolve => {
      const process = spawn(cmd, args, {
        stdio: 'inherit',
        cwd: join(__dirname, '..', '..', '..'),
      });

      process.on('close', code => {
        if (code === 0) {
          console.log(`\n✅ Headless tests completed successfully`);
          resolve(true);
        } else {
          console.log(`\n❌ Headless tests failed with code ${code}`);
          resolve(false);
        }
      });

      process.on('error', error => {
        console.error(`\n💥 Failed to start test process: ${error.message}`);
        resolve(false);
      });
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new HeadlessTestRunner();

  const options: TestRunOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--headed':
        options.headed = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--trace':
        options.trace = true;
        break;
      case '--update':
        options.update = true;
        break;
      case '--config':
        options.config = args[++i];
        break;
      case '--project':
        options.project = args[++i];
        break;
      case '--reporter':
        options.reporters = options.reporters || [];
        options.reporters.push(args[++i]);
        break;
      case '--help':
      case '-h':
        console.log(`
Headless Test Runner for Seasons & Stars

Usage: npm run test:headless [options]

Options:
  --headed          Run tests with visible browser
  --debug           Run tests in debug mode  
  --trace           Enable trace collection
  --update          Update test snapshots
  --config <path>   Use custom config file
  --project <name>  Run specific project only
  --reporter <name> Add additional reporter
  --help, -h        Show this help message

Examples:
  npm run test:headless                    # Run all tests headless
  npm run test:headless -- --headed       # Run with visible browser
  npm run test:headless -- --debug        # Debug mode
  npm run test:headless -- --project foundry-headless-chrome

Prerequisites:
  - Foundry server running at http://localhost:30000  
  - Test worlds configured: PF2e, D&D5e, Dragonbane
  - Seasons & Stars module installed and active
        `);
        process.exit(0);
        break;
    }
  }

  const success = await runner.runTests(options);
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

export { HeadlessTestRunner };
