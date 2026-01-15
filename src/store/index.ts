/**
 * Main Zustand store combining all state slices
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { OrganizationSlice } from './organizationSlice';
import type { PolicySlice } from './policySlice';
import type { UISlice } from './uiSlice';
import type { ValidationSlice } from './validationSlice';
import type { PersistenceSlice } from './persistenceSlice';
import { createOrganizationSlice } from './organizationSlice';
import { createPolicySlice } from './policySlice';
import { createUISlice } from './uiSlice';
import { createValidationSlice } from './validationSlice';
import { createPersistenceSlice } from './persistenceSlice';

/**
 * Combined application state interface
 */
export interface AppState extends OrganizationSlice, PolicySlice, UISlice, ValidationSlice, PersistenceSlice {}

/**
 * Main application store
 */
export const useStore = create<AppState>()(
  devtools(
    (...args) => ({
      ...createOrganizationSlice(...args),
      ...createPolicySlice(...args),
      ...createUISlice(...args),
      ...createValidationSlice(...args),
      ...createPersistenceSlice(...args),
    }),
    {
      name: 'aws-scp-visualizer-store',
    }
  )
);

// Auto-save to localStorage when relevant state changes
let previousState: { 
  organization: AppState['organization']; 
  policies: AppState['policies']; 
  policyAttachments: AppState['policyAttachments']; 
  isInitialized: boolean;
} = {
  organization: null,
  policies: {},
  policyAttachments: [],
  isInitialized: false,
};

let saveTimeout: NodeJS.Timeout | null = null;

useStore.subscribe((state) => {
  // Only auto-save after initialization and when relevant data changes
  if (state.isInitialized && (
    state.organization !== previousState.organization ||
    state.policies !== previousState.policies ||
    state.policyAttachments !== previousState.policyAttachments
  )) {
    // Clear existing timeout to debounce saves
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Debounce the save operation to avoid excessive localStorage writes
    saveTimeout = setTimeout(() => {
      state.saveToLocalStorage();
      saveTimeout = null;
    }, 300); // Increased debounce time for better performance
  }
  
  // Update previous state
  previousState = {
    organization: state.organization,
    policies: state.policies,
    policyAttachments: state.policyAttachments,
    isInitialized: state.isInitialized,
  };
});

// Export individual slice types for convenience
export type { OrganizationSlice } from './organizationSlice';
export type { PolicySlice } from './policySlice';
export type { UISlice } from './uiSlice';
export type { ValidationSlice } from './validationSlice';
export type { PersistenceSlice } from './persistenceSlice';

// Expose store globally for tutorial access.
// The tutorial system (Driver.js in tutorialConfig.ts) needs to access store methods
// to control UI state during the tutorial (e.g., toggling policy badges, selecting nodes).
// Using 'any' here because properly extending the Window interface would require a global
// declaration that could conflict with the typed interface already defined in tutorialConfig.ts.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__appStore = {
    getState: () => useStore.getState(),
    setState: useStore.setState,
    subscribe: useStore.subscribe,
  };
}