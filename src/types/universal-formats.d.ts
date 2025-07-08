/**
 * Type definitions for Universal Format System
 */

import type { UniversalFormatName } from '../core/universal-format-registry';

/**
 * Extended format options that include universal format support
 */
export interface ExtendedFormatOptions {
  /** Standard calendar-specific format name */
  formatName?: string;
  /** Universal format name that works across all calendars */
  universalFormat?: UniversalFormatName;
  /** Format variant (for object-style formats) */
  variant?: string;
  /** Fallback universal format if primary format is not available */
  fallback?: UniversalFormatName;
  /** Whether to prefer universal formats over calendar-specific ones */
  preferUniversal?: boolean;
}

/**
 * Format resolution result
 */
export interface FormatResolution {
  /** The resolved template string */
  template: string;
  /** Whether the format came from universal registry */
  isUniversal: boolean;
  /** The actual format name that was used */
  resolvedName: string;
  /** Whether a fallback was used */
  usedFallback: boolean;
}

/**
 * Format capability information
 */
export interface FormatCapabilities {
  /** Whether the calendar supports time-based formats */
  supportsTime: boolean;
  /** Whether the calendar supports weekday-based formats */
  supportsWeekdays: boolean;
  /** Whether the calendar supports month-based formats */
  supportsMonths: boolean;
  /** Number of available calendar-specific formats */
  customFormatCount: number;
  /** Compatible universal formats */
  compatibleUniversalFormats: UniversalFormatName[];
}

/**
 * Format suggestion for calendar setup
 */
export interface FormatSuggestion {
  /** Universal format name */
  formatName: UniversalFormatName;
  /** Template that would be used */
  template: string;
  /** Human-readable description */
  description: string;
  /** Reason why this format is suggested */
  reason: string;
  /** Priority level (higher = more important) */
  priority: number;
}

/**
 * Format validation result
 */
export interface FormatValidation {
  /** Whether the format is valid for the calendar */
  isValid: boolean;
  /** Validation error message if invalid */
  error?: string;
  /** Warnings about format usage */
  warnings: string[];
  /** Whether the format requires additional calendar features */
  missingFeatures: string[];
}

/**
 * Format conversion options
 */
export interface FormatConversionOptions {
  /** Source calendar ID */
  sourceCalendar: string;
  /** Target calendar ID */
  targetCalendar: string;
  /** Whether to preserve semantic meaning vs literal format */
  preserveSemantics?: boolean;
  /** Whether to allow approximate conversions */
  allowApproximate?: boolean;
}
