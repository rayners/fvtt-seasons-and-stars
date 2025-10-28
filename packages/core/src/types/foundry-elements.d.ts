/**
 * Type definitions for Foundry VTT custom HTML elements
 */

/**
 * Foundry's string-tags custom element for tag input
 * @see https://foundryvtt.com/api/classes/foundry.applications.elements.HTMLStringTagsElement.html
 */
export interface StringTagsElement extends HTMLElement {
  /** Array of tag strings */
  value: string[];
}
