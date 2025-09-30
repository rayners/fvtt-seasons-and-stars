/**
 * Permission management system for calendar notes
 */

/**
 * Type guard to check if a value is a valid ownership level
 */
function isValidOwnershipLevel(level: unknown): level is OwnershipLevel {
  if (typeof level !== 'number') return false;
  const validLevels = Object.values(CONST.DOCUMENT_OWNERSHIP_LEVELS) as number[];
  return validLevels.includes(level);
}

/**
 * Manages permissions and access control for calendar notes
 */
export class NotePermissions {
  /**
   * Check if a user can create calendar notes
   */
  canCreateNote(user: User): boolean {
    // GMs can always create notes
    if (user.isGM) return true;

    // Check if players are allowed to create notes via setting
    const allowPlayerCreation = game.settings?.get(
      'seasons-and-stars',
      'allowPlayerNotes'
    ) as boolean;
    return allowPlayerCreation || false;
  }

  /**
   * Check if a user can edit a specific note
   */
  canEditNote(user: User, note: JournalEntry): boolean {
    // GMs can always edit notes
    if (user.isGM) return true;

    // Check ownership level
    const ownership = note.ownership;
    const userLevel =
      ownership[user.id] || ownership.default || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    return userLevel >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  }

  /**
   * Check if a user can delete a specific note
   */
  canDeleteNote(user: User, note: JournalEntry): boolean {
    // GMs can always delete notes
    if (user.isGM) return true;

    // Check ownership level (same as edit for now)
    const ownership = note.ownership;
    const userLevel =
      ownership[user.id] || ownership.default || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    return userLevel >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  }

  /**
   * Check if a user can view a specific note
   */
  canViewNote(user: User, note: JournalEntry): boolean {
    // GMs can always view notes
    if (user.isGM) return true;

    // Check ownership level
    const ownership = note.ownership;
    const userLevel =
      ownership[user.id] || ownership.default || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    return userLevel >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  }

  /**
   * Check if a user can manage a specific note's permissions
   */
  canManagePermissions(user: User, note: JournalEntry): boolean {
    // Only GMs can manage permissions
    if (user.isGM) return true;

    // Note creators with owner level can manage their own notes
    const ownership = note.ownership;
    const userLevel = ownership[user.id] || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    return userLevel >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  }

  /**
   * Set note ownership permissions
   */
  async setNoteOwnership(note: JournalEntry, ownership: Record<string, number>): Promise<void> {
    await note.update({ ownership });
  }

  /**
   * Set a note to be GM-only
   */
  async setGMOnly(note: JournalEntry): Promise<void> {
    await this.setNoteOwnership(note, {
      default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
    });
  }

  /**
   * Set a note to be player-visible
   */
  async setPlayerVisible(note: JournalEntry): Promise<void> {
    await this.setNoteOwnership(note, {
      default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
    });
  }

  /**
   * Set a note to be player-editable
   */
  async setPlayerEditable(note: JournalEntry): Promise<void> {
    await this.setNoteOwnership(note, {
      default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    });
  }

  /**
   * Give a specific user ownership of a note
   */
  async setUserOwnership(note: JournalEntry, userId: string, level: number): Promise<void> {
    const currentOwnership = note.ownership || {};
    const newOwnership = {
      ...currentOwnership,
      [userId]: level,
    };

    await this.setNoteOwnership(note, newOwnership);
  }

  /**
   * Remove a user's specific permissions (fall back to default)
   */
  async removeUserOwnership(note: JournalEntry, userId: string): Promise<void> {
    const currentOwnership = note.ownership || {};
    const newOwnership = { ...currentOwnership };
    delete newOwnership[userId];

    await this.setNoteOwnership(note, newOwnership);
  }

  /**
   * Get the effective permission level for a user on a note
   */
  getUserPermissionLevel(user: User, note: JournalEntry): number {
    if (user.isGM) return CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;

    const ownership = note.ownership;
    return ownership[user.id] || ownership.default || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
  }

  /**
   * Get a human-readable permission level name
   */
  getPermissionLevelName(level: number): string {
    switch (level) {
      case CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE:
        return 'None';
      case CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED:
        return 'Limited';
      case CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER:
        return 'Observer';
      case CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER:
        return 'Owner';
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if an action is a GM-only feature
   */
  isGMOnlyFeature(action: string): boolean {
    const gmOnlyActions = [
      'manage-permissions',
      'delete-any-note',
      'edit-any-note',
      'view-private-notes',
      'bulk-operations',
      'import-export',
    ];

    return gmOnlyActions.includes(action);
  }

  /**
   * Check if a user can perform a GM-only action
   */
  canPerformGMAction(user: User, action: string): boolean {
    if (!this.isGMOnlyFeature(action)) return true;
    return user.isGM;
  }

  /**
   * Filter notes based on user permissions
   */
  filterNotesByPermission(
    notes: JournalEntry[],
    user: User,
    requiredLevel: number = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
  ): JournalEntry[] {
    return notes.filter(note => {
      const userLevel = this.getUserPermissionLevel(user, note);
      return userLevel >= requiredLevel;
    });
  }

  /**
   * Get all notes the user can view
   */
  getViewableNotes(user: User): JournalEntry[] {
    const allNotes =
      game.journal?.filter(journal => {
        const flags = journal.flags?.['seasons-and-stars'];
        return flags?.calendarNote === true;
      }) || [];

    return this.filterNotesByPermission(allNotes, user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
  }

  /**
   * Get all notes the user can edit
   */
  getEditableNotes(user: User): JournalEntry[] {
    const allNotes =
      game.journal?.filter(journal => {
        const flags = journal.flags?.['seasons-and-stars'];
        return flags?.calendarNote === true;
      }) || [];

    return this.filterNotesByPermission(allNotes, user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
  }

  /**
   * Check if the current user has sufficient permissions for an operation
   */
  checkPermission(
    operation: 'create' | 'view' | 'edit' | 'delete' | 'manage',
    note?: JournalEntry,
    user?: User
  ): boolean {
    const currentUser = user || game.user;
    if (!currentUser) return false;

    switch (operation) {
      case 'create':
        return this.canCreateNote(currentUser);

      case 'view':
        return note ? this.canViewNote(currentUser, note) : false;

      case 'edit':
        return note ? this.canEditNote(currentUser, note) : false;

      case 'delete':
        return note ? this.canDeleteNote(currentUser, note) : false;

      case 'manage':
        return note ? this.canManagePermissions(currentUser, note) : false;

      default:
        return false;
    }
  }

  /**
   * Create ownership object for new notes based on settings
   */
  getDefaultOwnership(creatorId: string): Record<string, number> {
    const playerVisible = game.settings?.get(
      'seasons-and-stars',
      'defaultPlayerVisible'
    ) as boolean;
    const playerEditable = game.settings?.get(
      'seasons-and-stars',
      'defaultPlayerEditable'
    ) as boolean;

    let defaultLevel: OwnershipLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;

    if (playerEditable) {
      defaultLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    } else if (playerVisible) {
      defaultLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    }

    return {
      [creatorId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
      default: defaultLevel,
    };
  }

  /**
   * Validate ownership data
   */
  validateOwnership(ownership: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!ownership || typeof ownership !== 'object') {
      errors.push('Ownership must be an object');
      return { isValid: false, errors };
    }

    const ownershipObj = ownership as Record<string, unknown>;
    // Check default level
    if (ownershipObj.default !== undefined) {
      if (!isValidOwnershipLevel(ownershipObj.default)) {
        errors.push(`Invalid default ownership level: ${ownershipObj.default}`);
      }
    }

    // Check user-specific levels
    for (const [userId, level] of Object.entries(ownership)) {
      if (userId === 'default') continue;

      if (!isValidOwnershipLevel(level)) {
        errors.push(`Invalid ownership level for user ${userId}: ${level}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Get permission summary for debugging
   */
  getPermissionSummary(note: JournalEntry, user?: User): Record<string, unknown> | null {
    const currentUser = user || game.user;
    if (!currentUser) return null;

    return {
      noteId: note.id,
      noteName: note.name,
      userId: currentUser.id,
      userName: currentUser.name,
      isGM: currentUser.isGM,
      permissionLevel: this.getUserPermissionLevel(currentUser, note),
      permissionName: this.getPermissionLevelName(this.getUserPermissionLevel(currentUser, note)),
      canView: this.canViewNote(currentUser, note),
      canEdit: this.canEditNote(currentUser, note),
      canDelete: this.canDeleteNote(currentUser, note),
      canManage: this.canManagePermissions(currentUser, note),
      ownership: note.ownership,
    };
  }
}

/**
 * Singleton instance for global access
 */
export const notePermissions = new NotePermissions();
