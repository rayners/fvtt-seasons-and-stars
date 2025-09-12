import { test as base, Browser } from '@playwright/test';
import { FoundryTestClient, TestWorld, TestUser, DEFAULT_CONFIG } from './FoundryTestClient';

export interface FoundryFixtures {
  foundryClient: FoundryTestClient;
  gmClient: FoundryTestClient;
  playerClient: FoundryTestClient;
  pf2eWorld: TestWorld;
  dnd5eWorld: TestWorld;
  dragonbaneWorld: TestWorld;
  gmUser: TestUser;
  playerUser: TestUser;
}

export const foundryTest = base.extend<FoundryFixtures>({
  // Base Foundry client
  foundryClient: async ({ browser }, use) => {
    const client = new FoundryTestClient(browser);
    await client.initialize();
    await use(client);
    await client.cleanup();
  },

  // GM-specific client
  gmClient: async ({ browser }, use) => {
    const client = new FoundryTestClient(browser);
    await client.initialize();
    await use(client);
    await client.cleanup();
  },

  // Player-specific client  
  playerClient: async ({ browser }, use) => {
    const client = new FoundryTestClient(browser);
    await client.initialize();
    await use(client);
    await client.cleanup();
  },

  // Test world fixtures
  pf2eWorld: async ({}, use) => {
    const world = DEFAULT_CONFIG.worlds.find(w => w.system === 'pf2e');
    if (!world) throw new Error('PF2e world not configured');
    await use(world);
  },

  dnd5eWorld: async ({}, use) => {
    const world = DEFAULT_CONFIG.worlds.find(w => w.system === 'dnd5e'); 
    if (!world) throw new Error('D&D5e world not configured');
    await use(world);
  },

  dragonbaneWorld: async ({}, use) => {
    const world = DEFAULT_CONFIG.worlds.find(w => w.system === 'dragonbane');
    if (!world) throw new Error('Dragonbane world not configured'); 
    await use(world);
  },

  // User fixtures
  gmUser: async ({}, use) => {
    const user = DEFAULT_CONFIG.users.find(u => u.role === 'gamemaster');
    if (!user) throw new Error('GM user not configured');
    await use(user);
  },

  playerUser: async ({}, use) => {
    const user = DEFAULT_CONFIG.users.find(u => u.role === 'player');
    if (!user) throw new Error('Player user not configured');
    await use(user);
  },
});

export { expect } from '@playwright/test';