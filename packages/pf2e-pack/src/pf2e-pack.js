/**
 * Seasons & Stars - Pathfinder 2e Integration Pack
 *
 * Provides PF2e-specific time sources and compatibility features.
 * Requires the main Seasons & Stars module to be installed and active.
 */

/**
 * Simple PF2e Integration Manager
 *
 * Handles PF2e-specific time sources and monitoring.
 */
export class PF2eIntegration {
  static instance = null;
  isActive = false;

  constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Initialize PF2e integration (called only when PF2e system is detected)
   */
  static initialize() {
    if (PF2eIntegration.instance) {
      return PF2eIntegration.instance;
    }

    PF2eIntegration.instance = new PF2eIntegration();
    PF2eIntegration.instance.activate();
    return PF2eIntegration.instance;
  }

  /**
   * Activate PF2e integration
   */
  activate() {
    if (this.isActive) return;

    console.log(
      'Seasons & Stars PF2e Pack: PF2e system detected - enabling enhanced compatibility mode'
    );
    this.isActive = true;
  }

  /**
   * Get PF2e world creation timestamp
   * Consolidated helper to avoid duplication of worldCreatedOn access
   */
  getWorldCreatedOn() {
    try {
      const worldCreatedOn = game.pf2e?.settings?.worldClock?.worldCreatedOn;
      return worldCreatedOn || null;
    } catch (error) {
      console.error(
        'Seasons & Stars PF2e Pack: Error accessing PF2e worldCreatedOn:',
        error instanceof Error ? error : undefined
      );
      return null;
    }
  }

  /**
   * Get PF2e world creation timestamp as fixed baseline
   */
  getWorldCreationTimestamp() {
    try {
      const worldCreatedOn = this.getWorldCreatedOn();
      if (!worldCreatedOn) {
        console.log('Seasons & Stars PF2e Pack: No PF2e worldCreatedOn found');
        return null;
      }

      const pf2eCreationDate = new Date(worldCreatedOn);
      if (isNaN(pf2eCreationDate.getTime())) {
        console.error(
          'Seasons & Stars PF2e Pack: Invalid PF2e worldCreatedOn format:',
          new Error(`Invalid date format: ${worldCreatedOn}`)
        );
        return null;
      }

      const timestamp = Math.floor(pf2eCreationDate.getTime() / 1000);
      console.log('Seasons & Stars PF2e Pack: PF2e world creation timestamp:', {
        worldCreatedOn,
        timestamp,
        readableDate: pf2eCreationDate.toISOString(),
      });

      return timestamp;
    } catch (error) {
      console.error(
        'Seasons & Stars PF2e Pack: Error getting PF2e world creation timestamp:',
        error instanceof Error ? error : undefined
      );
      return null;
    }
  }

  /**
   * Get the active PF2e integration instance
   */
  static getInstance() {
    return PF2eIntegration.instance;
  }

  /**
   * Check if PF2e integration is active
   */
  isIntegrationActive() {
    return this.isActive;
  }

  /**
   * Cleanup integration when module is disabled
   */
  destroy() {
    this.isActive = false;
  }
}

// Main integration entry point - register time source and data providers with S&S core
Hooks.on('seasons-stars:pf2e:systemDetected', compatibilityManager => {
  console.log(
    'Seasons & Stars PF2e Pack: PF2e system detected - registering time source and data providers with compatibility manager'
  );

  // Initialize PF2e integration
  const integration = PF2eIntegration.initialize();

  // Register world creation timestamp data provider
  compatibilityManager.registerDataProvider('pf2e', 'worldCreationTimestamp', () => {
    return integration.getWorldCreationTimestamp();
  });

  // Register worldTime transformation function for PF2e-aware date calculations
  compatibilityManager.registerDataProvider('pf2e', 'worldTimeTransform', () => {
    return (worldTime, defaultOffset) => {
      // Return worldTime and PF2e world creation timestamp as system time offset
      const systemTimeOffset = integration.getWorldCreationTimestamp();
      return [worldTime, systemTimeOffset || defaultOffset];
    };
  });
});

// Initialize when ready
Hooks.once('ready', () => {
  console.log('Seasons & Stars PF2e Pack: Module loaded and ready');
});
