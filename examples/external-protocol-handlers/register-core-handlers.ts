/**
 * Registration Example for Core Protocol Handlers
 * 
 * This file demonstrates how to register the GitHub and Local protocol handlers
 * that were moved from the core module to external examples. This shows the exact
 * pattern that external modules should follow to add these protocols back.
 * 
 * Note: These are the same handlers that were previously built into the core,
 * now available as external examples that modules can choose to include.
 */

import { GitHubCalendarLoader } from './github-calendar-loader';
import { LocalCalendarLoader } from './local-calendar-loader';

/**
 * Register the GitHub and Local protocol handlers
 * This is what you would put in your module's initialization
 */
export function registerCoreProtocolHandlers() {
  Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
    try {
      // Register GitHub protocol handler
      const githubHandler = new GitHubCalendarLoader();
      const githubSuccess = registerHandler(githubHandler);
      if (githubSuccess) {
        console.info('Successfully registered GitHub calendar loader');
      } else {
        console.warn('Failed to register GitHub calendar loader (may already be registered)');
      }
      
      // Register Local protocol handler  
      const localHandler = new LocalCalendarLoader();
      const localSuccess = registerHandler(localHandler);
      if (localSuccess) {
        console.info('Successfully registered Local calendar loader');
      } else {
        console.warn('Failed to register Local calendar loader (may already be registered)');
      }
      
    } catch (error) {
      console.error('Error registering core protocol handlers:', error);
    }
  });
}

/**
 * Example: Conditional registration
 * Only register handlers if they're not already available
 */
export function registerCoreProtocolHandlersConditionally() {
  Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
    // Get the external registry to check existing protocols
    const manager = game.seasonsStars?.manager;
    const registry = manager?.getExternalRegistry?.();
    
    if (registry) {
      // Check if GitHub handler is already registered
      if (!registry.hasHandler('github')) {
        const githubHandler = new GitHubCalendarLoader();
        registerHandler(githubHandler);
        console.info('Registered GitHub calendar loader');
      } else {
        console.debug('GitHub calendar loader already registered');
      }
      
      // Check if Local handler is already registered
      if (!registry.hasHandler('local')) {
        const localHandler = new LocalCalendarLoader();
        registerHandler(localHandler);
        console.info('Registered Local calendar loader');
      } else {
        console.debug('Local calendar loader already registered');
      }
    } else {
      console.warn('Could not access external registry for conditional registration');
      // Fallback to normal registration
      registerCoreProtocolHandlers();
    }
  });
}

/**
 * Module initialization example
 * This is how you would integrate this into your module
 */
export function initializeMyModule() {
  console.log('Initializing My Module with Seasons & Stars integration');
  
  // Wait for Seasons & Stars to be ready, then register our protocol handlers
  Hooks.once('seasons-stars:ready', () => {
    console.log('Seasons & Stars is ready, registering protocol handlers');
    registerCoreProtocolHandlers();
  });
  
  // Alternative: Register immediately (the hook will queue until S&S is ready)
  // registerCoreProtocolHandlers();
}

/**
 * Advanced example: Module with settings
 * Allow users to enable/disable specific protocol handlers
 */
export function registerProtocolHandlersWithSettings() {
  // Register module settings
  game.settings.register('my-module', 'enableGitHubLoader', {
    name: 'Enable GitHub Calendar Loader',
    hint: 'Allow loading calendars from GitHub repositories',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
  
  game.settings.register('my-module', 'enableLocalLoader', {
    name: 'Enable Local Calendar Loader', 
    hint: 'Allow loading calendars from local file system',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
  
  // Register handlers based on settings
  Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
    if (game.settings.get('my-module', 'enableGitHubLoader')) {
      registerHandler(new GitHubCalendarLoader());
      console.info('GitHub calendar loader enabled via settings');
    }
    
    if (game.settings.get('my-module', 'enableLocalLoader')) {
      registerHandler(new LocalCalendarLoader());
      console.info('Local calendar loader enabled via settings');
    }
  });
}