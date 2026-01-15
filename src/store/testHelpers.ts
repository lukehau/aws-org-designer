/**
 * Shared test helpers for store testing
 * 
 * This file provides common utilities used across multiple test files:
 * - createTestStore: Creates a complete test store with ALL five slices
 * - createMinimalOrganization: Creates a minimal Organization object for testing
 * - resetPersistenceManager: Resets the PersistenceManager singleton for test isolation
 * - createMockFile: Creates mock File objects for import testing
 */

import { create } from 'zustand';
import type { AppState } from './index';
import type { Organization } from '../types/organization';
import { createOrganizationSlice } from './organizationSlice';
import { createPolicySlice } from './policySlice';
import { createValidationSlice } from './validationSlice';
import { createPersistenceSlice } from './persistenceSlice';
import { createUISlice } from './uiSlice';
import { PersistenceManager } from '../lib/persistence';

/**
 * Helper to create minimal organization for testing
 * IMPORTANT: Must include the 'limits' field which is required by Organization type
 */
export const createMinimalOrganization = (): Organization => ({
  id: 'test-org',
  name: 'Test Organization',
  rootId: 'root-1',
  nodes: {
    'root-1': {
      id: 'root-1',
      type: 'root',
      name: 'Test Organization',
      parentId: null,
      children: [],
      position: { x: 0, y: 0 },
      metadata: {
        createdAt: new Date(),
        lastModified: new Date(),
      },
    },
  },
  limits: {
    maxAccounts: 10,
    maxOUs: 2000,
    maxNestingLevels: 5,
    maxSCPsPerNode: 5,
    maxRCPsPerNode: 5,
    maxPolicySize: 5120,
  },
});

/**
 * Helper to create complete test store with ALL slices
 * IMPORTANT: Uses actual slice creators instead of stub properties
 * This ensures the test store matches the real AppState interface
 */
export const createTestStore = () => {
  return create<AppState>()((...args) => ({
    ...createOrganizationSlice(...args),
    ...createPolicySlice(...args),
    ...createValidationSlice(...args),
    ...createPersistenceSlice(...args),
    ...createUISlice(...args),
  }));
};

/**
 * Helper to reset PersistenceManager singleton for test isolation
 * This ensures each test starts with a fresh PersistenceManager instance
 */
export const resetPersistenceManager = (): void => {
  // @ts-expect-error - accessing private static for testing
  PersistenceManager.instance = undefined;
};

/**
 * Helper to create mock File object for import testing
 * @param content - The string content of the file
 * @param filename - The filename (defaults to 'test.json')
 * @returns A File object with the specified content
 */
export const createMockFile = (content: string, filename: string = 'test.json'): File => {
  return new File([content], filename, { type: 'application/json' });
};
