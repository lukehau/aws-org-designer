/**
 * Persistence and state management types
 */

import type { Organization } from './organization';
import type { Policy, PolicyAttachment } from './policy';

/**
 * Complete organization state for persistence
 */
export interface PersistedState {
  /** Version of the persistence format */
  version: string;
  /** Complete organization structure */
  organization: Organization;
  /** All policies indexed by ID */
  policies: Record<string, Policy>;
  /** All policy attachments */
  policyAttachments: PolicyAttachment[];
  /** Persistence metadata */
  metadata: {
    /** When the state was last saved */
    lastSaved: Date;
    /** Application version that saved this state */
    appVersion: string;
    /** Organization version for export tracking */
    organizationVersion: string;
  };
}