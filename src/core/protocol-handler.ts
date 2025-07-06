/**
 * Protocol Handler Extensibility System
 *
 * Allows modules to register custom protocol handlers for calendar loading.
 * Examples: github:user/repo/calendar.json, google:calendar-id, custom:my-source
 *
 * This system extends the basic URL loading functionality to support
 * custom protocols that modules can register and handle.
 */

import { Logger } from './logger';
import type { LoadResult, LoaderOptions } from './calendar-loader';
import type { SeasonsStarsCalendar } from '../types/calendar';

export interface ProtocolHandlerOptions extends LoaderOptions {
  /** Additional protocol-specific parameters */
  protocolParams?: Record<string, unknown>;
}

export interface ProtocolHandler {
  /** Unique identifier for this handler */
  id: string;
  /** Protocol scheme this handler supports (e.g., 'github', 'google') */
  protocol: string;
  /** Human-readable name for this handler */
  name: string;
  /** Module that registered this handler */
  moduleId: string;
  /** Handler function that loads calendar data */
  handler: (path: string, options?: ProtocolHandlerOptions) => Promise<LoadResult>;
  /** Optional validation function for protocol paths */
  validatePath?: (path: string) => boolean;
  /** Optional description of what this handler does */
  description?: string;
}

export interface ProtocolHandlerRegistration {
  /** Protocol scheme to register (e.g., 'github', 'google') */
  protocol: string;
  /** Human-readable name for this handler */
  name: string;
  /** Handler function */
  handler: (path: string, options?: ProtocolHandlerOptions) => Promise<LoadResult>;
  /** Optional path validation */
  validatePath?: (path: string) => boolean;
  /** Optional description */
  description?: string;
}

/**
 * Registry and dispatcher for protocol handlers
 */
export class ProtocolHandlerRegistry {
  private static instance: ProtocolHandlerRegistry | null = null;
  private handlers = new Map<string, ProtocolHandler>();
  private handlerCounter = 0;

  private constructor() {
    this.registerBuiltInHandlers();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ProtocolHandlerRegistry {
    if (!ProtocolHandlerRegistry.instance) {
      ProtocolHandlerRegistry.instance = new ProtocolHandlerRegistry();
    }
    return ProtocolHandlerRegistry.instance;
  }

  /**
   * Register a protocol handler
   */
  registerHandler(moduleId: string, registration: ProtocolHandlerRegistration): string {
    // Validate protocol format
    if (!this.isValidProtocol(registration.protocol)) {
      throw new Error(
        `Invalid protocol format: ${registration.protocol}. Must be alphanumeric with optional hyphens.`
      );
    }

    // Check for conflicts
    const existingHandler = this.getHandlerByProtocol(registration.protocol);
    if (existingHandler) {
      throw new Error(
        `Protocol '${registration.protocol}' is already registered by module '${existingHandler.moduleId}'`
      );
    }

    // Generate unique ID
    const id = `${registration.protocol}-${++this.handlerCounter}`;

    const handler: ProtocolHandler = {
      id,
      protocol: registration.protocol,
      name: registration.name,
      moduleId,
      handler: registration.handler,
      validatePath: registration.validatePath,
      description: registration.description,
    };

    this.handlers.set(registration.protocol, handler);

    Logger.info(`Protocol handler registered: ${registration.protocol} by ${moduleId}`);

    // Emit hook for other modules to know about new handler
    Hooks.callAll('seasons-stars:protocolHandlerRegistered', {
      protocol: registration.protocol,
      moduleId,
      handler: handler,
    });

    return id;
  }

  /**
   * Unregister a protocol handler
   */
  unregisterHandler(protocol: string, moduleId: string): boolean {
    const handler = this.handlers.get(protocol);
    if (!handler) {
      return false;
    }

    // Only allow the registering module to unregister
    if (handler.moduleId !== moduleId) {
      Logger.warn(
        `Module ${moduleId} attempted to unregister protocol ${protocol} owned by ${handler.moduleId}`
      );
      return false;
    }

    this.handlers.delete(protocol);
    Logger.info(`Protocol handler unregistered: ${protocol} by ${moduleId}`);

    // Emit hook for cleanup
    Hooks.callAll('seasons-stars:protocolHandlerUnregistered', {
      protocol,
      moduleId,
      handler,
    });

    return true;
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): ProtocolHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get handler for a specific protocol
   */
  getHandlerByProtocol(protocol: string): ProtocolHandler | undefined {
    return this.handlers.get(protocol);
  }

  /**
   * Get handlers registered by a specific module
   */
  getHandlersByModule(moduleId: string): ProtocolHandler[] {
    return this.getHandlers().filter(handler => handler.moduleId === moduleId);
  }

  /**
   * Check if a protocol is supported
   */
  isProtocolSupported(protocol: string): boolean {
    return this.handlers.has(protocol);
  }

  /**
   * Parse a protocol URL and return protocol and path
   */
  parseProtocolUrl(url: string): { protocol: string; path: string } | null {
    const match = url.match(/^([a-zA-Z][a-zA-Z0-9-]*):(.+)$/);
    if (!match) {
      return null;
    }

    return {
      protocol: match[1],
      path: match[2],
    };
  }

  /**
   * Load calendar using appropriate protocol handler
   */
  async loadFromProtocol(url: string, options?: ProtocolHandlerOptions): Promise<LoadResult> {
    const parsed = this.parseProtocolUrl(url);
    if (!parsed) {
      return {
        success: false,
        error: `Invalid protocol URL format: ${url}`,
        sourceUrl: url,
      };
    }

    const handler = this.getHandlerByProtocol(parsed.protocol);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for protocol: ${parsed.protocol}`,
        sourceUrl: url,
      };
    }

    // Validate path if handler provides validation
    if (handler.validatePath && !handler.validatePath(parsed.path)) {
      return {
        success: false,
        error: `Invalid path format for protocol ${parsed.protocol}: ${parsed.path}`,
        sourceUrl: url,
      };
    }

    try {
      Logger.debug(`Loading calendar via protocol handler: ${parsed.protocol}:${parsed.path}`);

      const result = await handler.handler(parsed.path, options);

      // Ensure result has sourceUrl
      if (result.success) {
        result.sourceUrl = url;
        Logger.info(`Successfully loaded calendar via ${parsed.protocol} protocol`);
      } else {
        Logger.warn(`Failed to load calendar via ${parsed.protocol} protocol: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Protocol handler ${parsed.protocol} threw error`, error as Error);

      return {
        success: false,
        error: `Protocol handler error: ${errorMessage}`,
        sourceUrl: url,
      };
    }
  }

  /**
   * Validate protocol format
   */
  private isValidProtocol(protocol: string): boolean {
    // Protocol must start with letter, contain only alphanumeric and hyphens
    return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(protocol);
  }

  /**
   * Register built-in protocol handlers
   */
  private registerBuiltInHandlers(): void {
    // File protocol for local file system access (development/testing)
    this.handlers.set('file', {
      id: 'file-builtin',
      protocol: 'file',
      name: 'Local File System',
      moduleId: 'seasons-and-stars',
      handler: async (path: string): Promise<LoadResult> => {
        return {
          success: false,
          error: 'File protocol not supported in browser environment',
          sourceUrl: `file:${path}`,
        };
      },
      validatePath: (path: string) => path.startsWith('/') || path.match(/^[a-zA-Z]:/),
      description: 'Access local file system (development only)',
    });

    // Data protocol for inline calendar data
    this.handlers.set('data', {
      id: 'data-builtin',
      protocol: 'data',
      name: 'Inline Data',
      moduleId: 'seasons-and-stars',
      handler: async (path: string): Promise<LoadResult> => {
        try {
          // Expect base64 encoded JSON after 'data:'
          const jsonData = atob(path);
          const calendar = JSON.parse(jsonData) as SeasonsStarsCalendar;

          return {
            success: true,
            calendar,
            fromCache: false,
            sourceUrl: `data:${path}`,
          };
        } catch (error) {
          return {
            success: false,
            error: `Invalid data protocol format: ${error instanceof Error ? error.message : 'Unknown error'}`,
            sourceUrl: `data:${path}`,
          };
        }
      },
      validatePath: (path: string) => {
        try {
          atob(path);
          return true;
        } catch {
          return false;
        }
      },
      description: 'Load calendar from base64-encoded inline data',
    });

    Logger.debug('Built-in protocol handlers registered: file, data');
  }

  /**
   * Unregister all handlers for a module (cleanup)
   */
  unregisterModuleHandlers(moduleId: string): void {
    const handlersToRemove = this.getHandlersByModule(moduleId);

    for (const handler of handlersToRemove) {
      this.unregisterHandler(handler.protocol, moduleId);
    }

    if (handlersToRemove.length > 0) {
      Logger.info(
        `Unregistered ${handlersToRemove.length} protocol handlers for module ${moduleId}`
      );
    }
  }

  /**
   * Get debug information about registered handlers
   */
  getDebugInfo() {
    return {
      handlerCount: this.handlers.size,
      protocols: Array.from(this.handlers.keys()),
      handlers: this.getHandlers().map(h => ({
        protocol: h.protocol,
        name: h.name,
        moduleId: h.moduleId,
        hasValidation: !!h.validatePath,
        description: h.description,
      })),
    };
  }
}

/**
 * Global API for protocol handler management
 */
export const protocolHandlers = {
  /**
   * Register a protocol handler
   */
  register(moduleId: string, registration: ProtocolHandlerRegistration): string {
    return ProtocolHandlerRegistry.getInstance().registerHandler(moduleId, registration);
  },

  /**
   * Unregister a protocol handler
   */
  unregister(protocol: string, moduleId: string): boolean {
    return ProtocolHandlerRegistry.getInstance().unregisterHandler(protocol, moduleId);
  },

  /**
   * Check if a protocol is supported
   */
  isSupported(protocol: string): boolean {
    return ProtocolHandlerRegistry.getInstance().isProtocolSupported(protocol);
  },

  /**
   * Get all registered handlers
   */
  getAll(): ProtocolHandler[] {
    return ProtocolHandlerRegistry.getInstance().getHandlers();
  },

  /**
   * Get handler for specific protocol
   */
  get(protocol: string): ProtocolHandler | undefined {
    return ProtocolHandlerRegistry.getInstance().getHandlerByProtocol(protocol);
  },

  /**
   * Load calendar using protocol handler
   */
  load(url: string, options?: ProtocolHandlerOptions): Promise<LoadResult> {
    return ProtocolHandlerRegistry.getInstance().loadFromProtocol(url, options);
  },

  /**
   * Parse protocol URL
   */
  parseUrl(url: string): { protocol: string; path: string } | null {
    return ProtocolHandlerRegistry.getInstance().parseProtocolUrl(url);
  },
};
