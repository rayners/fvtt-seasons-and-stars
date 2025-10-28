/**
 * Note categories and tagging system for calendar notes
 */

export interface NoteCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  isDefault?: boolean;
}

export interface NoteCategoryConfig {
  categories: NoteCategory[];
  allowCustomTags: boolean;
  predefinedTags: string[];
}

/**
 * Default note categories with icons and colors
 */
export const DEFAULT_CATEGORIES: NoteCategory[] = [
  {
    id: 'general',
    name: 'General',
    icon: 'fas fa-sticky-note',
    color: '#4a90e2',
    description: 'General notes and reminders',
    isDefault: true,
  },
  {
    id: 'event',
    name: 'Event',
    icon: 'fas fa-calendar-star',
    color: '#7b68ee',
    description: 'Special events and occasions',
  },
  {
    id: 'reminder',
    name: 'Reminder',
    icon: 'fas fa-bell',
    color: '#ffa500',
    description: 'Important reminders and deadlines',
  },
  {
    id: 'weather',
    name: 'Weather',
    icon: 'fas fa-cloud-sun',
    color: '#87ceeb',
    description: 'Weather conditions and patterns',
  },
  {
    id: 'story',
    name: 'Story',
    icon: 'fas fa-book-open',
    color: '#98fb98',
    description: 'Story events and narrative notes',
  },
  {
    id: 'combat',
    name: 'Combat',
    icon: 'fas fa-crossed-swords',
    color: '#dc143c',
    description: 'Combat encounters and battles',
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: 'fas fa-route',
    color: '#daa520',
    description: 'Travel plans and journey notes',
  },
  {
    id: 'npc',
    name: 'NPC',
    icon: 'fas fa-users',
    color: '#9370db',
    description: 'Non-player character events',
  },
];

/**
 * Default predefined tags for common use cases
 */
export const DEFAULT_TAGS: string[] = [
  'important',
  'urgent',
  'party',
  'player',
  'gm-only',
  'public',
  'private',
  'completed',
  'in-progress',
  'planned',
  'cancelled',
];

/**
 * Manages note categories and tags
 */
export class NoteCategories {
  private config: NoteCategoryConfig;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load category configuration from game settings
   */
  private loadConfiguration(): NoteCategoryConfig {
    const savedConfig = game.settings.get(
      'seasons-and-stars',
      'noteCategories'
    ) as NoteCategoryConfig;

    if (savedConfig && savedConfig.categories) {
      // Merge saved categories with defaults, ensuring defaults exist
      const savedIds = new Set(savedConfig.categories.map(c => c.id));
      const missingDefaults = DEFAULT_CATEGORIES.filter(c => !savedIds.has(c.id));

      return {
        categories: [...savedConfig.categories, ...missingDefaults],
        allowCustomTags: savedConfig.allowCustomTags ?? true,
        predefinedTags: savedConfig.predefinedTags || DEFAULT_TAGS,
      };
    }

    return {
      categories: [...DEFAULT_CATEGORIES],
      allowCustomTags: true,
      predefinedTags: [...DEFAULT_TAGS],
    };
  }

  /**
   * Save category configuration to game settings
   */
  private async saveConfiguration(): Promise<void> {
    await game.settings.set('seasons-and-stars', 'noteCategories', this.config);
  }

  /**
   * Get all available categories
   */
  getCategories(): NoteCategory[] {
    return [...this.config.categories];
  }

  /**
   * Get category by ID
   */
  getCategory(id: string): NoteCategory | null {
    return this.config.categories.find(c => c.id === id) || null;
  }

  /**
   * Get default category
   */
  getDefaultCategory(): NoteCategory {
    return this.config.categories.find(c => c.isDefault) || this.config.categories[0];
  }

  /**
   * Add a new category
   */
  async addCategory(category: NoteCategory): Promise<void> {
    // Validate category
    if (!category.id || !category.name) {
      throw new Error('Category must have id and name');
    }

    // Check for duplicate ID
    if (this.config.categories.find(c => c.id === category.id)) {
      throw new Error(`Category with id '${category.id}' already exists`);
    }

    this.config.categories.push(category);
    await this.saveConfiguration();
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: string, updates: Partial<NoteCategory>): Promise<void> {
    const index = this.config.categories.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Category with id '${id}' not found`);
    }

    // Don't allow changing ID
    if (updates.id && updates.id !== id) {
      throw new Error('Cannot change category ID');
    }

    this.config.categories[index] = { ...this.config.categories[index], ...updates };
    await this.saveConfiguration();
  }

  /**
   * Remove a category
   */
  async removeCategory(id: string): Promise<void> {
    const category = this.getCategory(id);
    if (!category) {
      throw new Error(`Category with id '${id}' not found`);
    }

    // Prevent removal of default categories
    if (category.isDefault) {
      throw new Error('Cannot remove default category');
    }

    this.config.categories = this.config.categories.filter(c => c.id !== id);
    await this.saveConfiguration();
  }

  /**
   * Get all predefined tags
   */
  getPredefinedTags(): string[] {
    return [...this.config.predefinedTags];
  }

  /**
   * Add a predefined tag
   */
  async addPredefinedTag(tag: string): Promise<void> {
    if (!tag || typeof tag !== 'string') {
      throw new Error('Tag must be a non-empty string');
    }

    const normalizedTag = tag.toLowerCase().trim();
    if (this.config.predefinedTags.includes(normalizedTag)) {
      return; // Already exists
    }

    this.config.predefinedTags.push(normalizedTag);
    await this.saveConfiguration();
  }

  /**
   * Remove a predefined tag
   */
  async removePredefinedTag(tag: string): Promise<void> {
    const normalizedTag = tag.toLowerCase().trim();
    this.config.predefinedTags = this.config.predefinedTags.filter(t => t !== normalizedTag);
    await this.saveConfiguration();
  }

  /**
   * Check if custom tags are allowed
   */
  areCustomTagsAllowed(): boolean {
    return this.config.allowCustomTags;
  }

  /**
   * Set whether custom tags are allowed
   */
  async setCustomTagsAllowed(allowed: boolean): Promise<void> {
    this.config.allowCustomTags = allowed;
    await this.saveConfiguration();
  }

  /**
   * Validate tags against configuration
   */
  validateTags(tags: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const tag of tags) {
      const normalizedTag = tag.toLowerCase().trim();

      if (this.config.predefinedTags.includes(normalizedTag)) {
        valid.push(normalizedTag);
      } else if (this.config.allowCustomTags) {
        valid.push(normalizedTag);
      } else {
        invalid.push(tag);
      }
    }

    return { valid, invalid };
  }

  /**
   * Parse tag string into array of tags
   */
  parseTagString(tagString: string): string[] {
    if (!tagString) return [];

    return tagString
      .split(/[,;]/) // Split on comma or semicolon
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => tag.toLowerCase());
  }

  /**
   * Format tags array into string
   */
  formatTagsToString(tags: string[]): string {
    return tags.join(', ');
  }

  /**
   * Get category color for styling
   */
  getCategoryColor(categoryId: string): string {
    const category = this.getCategory(categoryId);
    return category?.color || '#4a90e2';
  }

  /**
   * Get category icon for display
   */
  getCategoryIcon(categoryId: string): string {
    const category = this.getCategory(categoryId);
    return category?.icon || 'fas fa-sticky-note';
  }

  /**
   * Search categories by name
   */
  searchCategories(query: string): NoteCategory[] {
    if (!query) return this.getCategories();

    const lowercaseQuery = query.toLowerCase();
    return this.config.categories.filter(
      category =>
        category.name.toLowerCase().includes(lowercaseQuery) ||
        category.description?.toLowerCase().includes(lowercaseQuery)
    );
  }
}

// Global instance - initialized manually in module.ts after settings are registered
export let noteCategories: NoteCategories;

/**
 * Initialize the global noteCategories instance
 * Called from module.ts after settings are registered
 */
export function initializeNoteCategories(): void {
  noteCategories = new NoteCategories();
}
