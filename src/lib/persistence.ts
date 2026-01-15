/**
 * Organization export/import utilities
 * Handles exporting and importing complete organization state as JSON files
 */

import type { PersistedState } from '../types/persistence';
import type { Organization } from '../types/organization';
import type { Policy, PolicyAttachment } from '../types/policy';

/**
 * Current persistence format version
 */
const PERSISTENCE_VERSION = '1.0.0';

/**
 * localStorage key for auto-persistence
 */
const LOCALSTORAGE_KEY = 'aws-org-designer-state';

/**
 * localStorage key for tutorial completion
 */
const TUTORIAL_COMPLETION_KEY = 'aws-org-designer-tutorial-completed';

/**
 * Persistence manager class for export/import functionality
 */
export class PersistenceManager {
  private static instance: PersistenceManager;
  private currentOrganizationVersion: string = '1.0';

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance) {
      PersistenceManager.instance = new PersistenceManager();
    }
    return PersistenceManager.instance;
  }

  /**
   * Export organization state as downloadable JSON file
   */
  async exportState(
    organization: Organization | null,
    policies: Record<string, Policy>,
    policyAttachments: PolicyAttachment[],
    filename?: string
  ): Promise<void> {
    if (!organization) {
      throw new Error('Cannot export state: no organization data');
    }

    // Increment version for this export
    this.currentOrganizationVersion = this.incrementVersion(this.currentOrganizationVersion);

    const appVersion = await this.getAppVersion();

    const persistedState: PersistedState = {
      version: PERSISTENCE_VERSION,
      organization,
      policies,
      policyAttachments,
      metadata: {
        lastSaved: new Date(),
        appVersion,
        organizationVersion: this.currentOrganizationVersion,
      },
    };

    const jsonContent = JSON.stringify(persistedState, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });

    // Generate filename using organization name and version
    const sanitizedOrgName = this.sanitizeFilename(organization.name);
    const exportFilename = filename || `${sanitizedOrgName}-${this.currentOrganizationVersion}.json`;

    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import organization state from uploaded JSON file
   */
  async importState(file: File): Promise<PersistedState> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const persistedState: PersistedState = JSON.parse(content);

          // Validate the imported data structure
          if (!persistedState.version || !persistedState.organization) {
            throw new Error('Invalid organization file format - missing required fields');
          }

          if (!persistedState.organization.nodes || !persistedState.organization.rootId) {
            throw new Error('Invalid organization structure in organization file');
          }

          // Ensure required fields exist
          if (!persistedState.policies) persistedState.policies = {};
          if (!persistedState.policyAttachments) persistedState.policyAttachments = [];
          if (!persistedState.metadata) {
            persistedState.metadata = {
              lastSaved: new Date(),
              appVersion: '0.0.0',
              organizationVersion: '1.0',
            };
          }

          // Set current organization version from imported data
          this.currentOrganizationVersion = persistedState.metadata.organizationVersion || '1.0';

          // Validate version compatibility
          if (persistedState.version !== PERSISTENCE_VERSION) {
            console.warn(`State version mismatch: expected ${PERSISTENCE_VERSION}, got ${persistedState.version}`);
            // Could implement migration logic here in the future
          }

          // Convert date strings back to Date objects
          persistedState.metadata.lastSaved = new Date(persistedState.metadata.lastSaved);
          persistedState.organization.nodes = Object.fromEntries(
            Object.entries(persistedState.organization.nodes).map(([id, node]) => [
              id,
              {
                ...node,
                metadata: {
                  ...node.metadata,
                  createdAt: new Date(node.metadata.createdAt),
                  lastModified: new Date(node.metadata.lastModified),
                },
              },
            ])
          );

          persistedState.policies = Object.fromEntries(
            Object.entries(persistedState.policies).map(([id, policy]) => [
              id,
              {
                ...policy,
                createdAt: new Date(policy.createdAt),
                lastModified: new Date(policy.lastModified),
              },
            ])
          );

          persistedState.policyAttachments = persistedState.policyAttachments.map(attachment => ({
            ...attachment,
            attachedAt: new Date(attachment.attachedAt),
          }));

          resolve(persistedState);
        } catch (error) {
          reject(new Error(`Failed to parse organization file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Get current organization version
   */
  getCurrentOrganizationVersion(): string {
    return this.currentOrganizationVersion;
  }

  /**
   * Set organization version (used when importing)
   */
  setOrganizationVersion(version: string): void {
    this.currentOrganizationVersion = version;
  }

  /**
   * Increment version number (minor version)
   * @internal Exposed for testing
   */
  incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;

    return `${major}.${minor + 1}`;
  }

  /**
   * Sanitize filename for filesystem compatibility
   * @internal Exposed for testing
   */
  sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get app version for metadata
   */
  private async getAppVersion(): Promise<string> {
    // In a real application, this would come from package.json or build process
    return '0.0.0';
  }

  /**
   * Save state to localStorage for auto-persistence
   */
  async saveToLocalStorage(
    organization: Organization | null,
    policies: Record<string, Policy>,
    policyAttachments: PolicyAttachment[]
  ): Promise<void> {
    if (!organization) {
      // If no organization, clear localStorage
      localStorage.removeItem(LOCALSTORAGE_KEY);
      return;
    }

    try {
      const appVersion = await this.getAppVersion();

      const persistedState: PersistedState = {
        version: PERSISTENCE_VERSION,
        organization,
        policies,
        policyAttachments,
        metadata: {
          lastSaved: new Date(),
          appVersion,
          organizationVersion: this.currentOrganizationVersion,
        },
      };

      const jsonContent = JSON.stringify(persistedState);
      localStorage.setItem(LOCALSTORAGE_KEY, jsonContent);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      // Don't throw error for localStorage failures - it's not critical
    }
  }

  /**
   * Load state from localStorage for auto-restoration
   */
  loadFromLocalStorage(): PersistedState | null {
    try {
      const stored = localStorage.getItem(LOCALSTORAGE_KEY);
      if (!stored) {
        return null;
      }

      const persistedState: PersistedState = JSON.parse(stored);

      // Validate the stored data structure
      if (!persistedState.version || !persistedState.organization) {
        console.warn('Invalid localStorage data structure - clearing');
        localStorage.removeItem(LOCALSTORAGE_KEY);
        return null;
      }

      if (!persistedState.organization.nodes || !persistedState.organization.rootId) {
        console.warn('Invalid organization structure in localStorage - clearing');
        localStorage.removeItem(LOCALSTORAGE_KEY);
        return null;
      }

      // Ensure required fields exist
      if (!persistedState.policies) persistedState.policies = {};
      if (!persistedState.policyAttachments) persistedState.policyAttachments = [];
      if (!persistedState.metadata) {
        persistedState.metadata = {
          lastSaved: new Date(),
          appVersion: '0.0.0',
          organizationVersion: '1.0',
        };
      }

      // Set current organization version from stored data
      this.currentOrganizationVersion = persistedState.metadata.organizationVersion || '1.0';

      // Validate version compatibility
      if (persistedState.version !== PERSISTENCE_VERSION) {
        console.warn(`localStorage version mismatch: expected ${PERSISTENCE_VERSION}, got ${persistedState.version}`);
        // Could implement migration logic here in the future
      }

      // Convert date strings back to Date objects
      persistedState.metadata.lastSaved = new Date(persistedState.metadata.lastSaved);
      persistedState.organization.nodes = Object.fromEntries(
        Object.entries(persistedState.organization.nodes).map(([id, node]) => [
          id,
          {
            ...node,
            metadata: {
              ...node.metadata,
              createdAt: new Date(node.metadata.createdAt),
              lastModified: new Date(node.metadata.lastModified),
            },
          },
        ])
      );

      persistedState.policies = Object.fromEntries(
        Object.entries(persistedState.policies).map(([id, policy]) => [
          id,
          {
            ...policy,
            createdAt: new Date(policy.createdAt),
            lastModified: new Date(policy.lastModified),
          },
        ])
      );

      persistedState.policyAttachments = persistedState.policyAttachments.map(attachment => ({
        ...attachment,
        attachedAt: new Date(attachment.attachedAt),
      }));

      return persistedState;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(LOCALSTORAGE_KEY);
      return null;
    }
  }

  /**
   * Clear localStorage data
   */
  clearLocalStorage(): void {
    localStorage.removeItem(LOCALSTORAGE_KEY);
  }

  /**
   * Save tutorial completion status
   */
  saveTutorialCompleted(completed: boolean): void {
    try {
      localStorage.setItem(TUTORIAL_COMPLETION_KEY, JSON.stringify(completed));
    } catch (error) {
      console.warn('Failed to save tutorial completion status:', error);
    }
  }

  /**
   * Load tutorial completion status
   */
  loadTutorialCompleted(): boolean {
    try {
      const stored = localStorage.getItem(TUTORIAL_COMPLETION_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch (error) {
      console.warn('Failed to load tutorial completion status:', error);
      return false;
    }
  }
}

/**
 * Convenience function to get persistence manager instance
 */
export const getPersistenceManager = () => PersistenceManager.getInstance();