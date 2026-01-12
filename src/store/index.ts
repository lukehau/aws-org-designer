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
export const useAppStore = create<AppState>()(
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
  organization: any; 
  policies: any; 
  policyAttachments: any; 
  isInitialized: boolean;
} = {
  organization: null,
  policies: {},
  policyAttachments: [],
  isInitialized: false,
};

let saveTimeout: NodeJS.Timeout | null = null;

useAppStore.subscribe((state) => {
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

// Export store as both useAppStore and useStore for compatibility
export const useStore = useAppStore;

// Expose store globally for tutorial access
if (typeof window !== 'undefined') {
  (window as any).__appStore = {
    getState: () => useAppStore.getState(),
    setState: useAppStore.setState,
    subscribe: useAppStore.subscribe,
  };
}