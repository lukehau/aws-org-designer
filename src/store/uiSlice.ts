/**
 * UI state slice for selection and view modes with comprehensive error handling
 */

import type { StateCreator } from 'zustand';
import type { AppState } from './index';
import type { ReactFlowInstance } from '@xyflow/react';
import { getPersistenceManager } from '@/lib/persistence';
import { downloadImage, generateImageFilename } from '@/utils/downloadImage';

// Toast functionality moved to Sonner

/**
 * Loading operation types
 */
export interface LoadingOperation {
  id: string;
  type: 'save' | 'load' | 'validate' | 'create' | 'update' | 'delete';
  message: string;
  progress?: number;
  startedAt: Date;
}

/**
 * UI state and actions
 */
export interface UISlice {
  // State
  loadingOperations: LoadingOperation[];
  errors: string[];
  viewMode: 'tree' | 'list';
  sidebarOpen: boolean;
  selectedPolicyType: 'scp' | 'rcp' | null;
  showInheritedPolicies: boolean;
  draggedNodeId: string | null;
  showErrorPanel: boolean;
  inheritanceTrailNodeId: string | null;
  centerViewOnNodeId: string | null;
  showAllPolicyBadges: boolean;
  tutorialActive: boolean;
  tutorialCompleted: boolean;
  reactFlowInstance: ReactFlowInstance | null;
  
  // Loading actions
  startLoadingOperation: (operation: Omit<LoadingOperation, 'id' | 'startedAt'>) => string;
  updateLoadingOperation: (id: string, updates: Partial<LoadingOperation>) => void;
  finishLoadingOperation: (id: string) => void;
  clearLoadingOperations: () => void;
  
  // Error actions
  addError: (error: string) => void;
  removeError: (index: number) => void;
  clearErrors: () => void;
  
  // Toast functionality moved to Sonner
  
  // View mode actions
  setViewMode: (mode: 'tree' | 'list') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleErrorPanel: () => void;
  setShowErrorPanel: (show: boolean) => void;
  
  // Policy management UI actions
  setSelectedPolicyType: (type: 'scp' | 'rcp' | null) => void;
  toggleShowInheritedPolicies: () => void;
  setShowInheritedPolicies: (show: boolean) => void;
  
  // Drag and drop actions
  setDraggedNodeId: (nodeId: string | null) => void;
  
  // Inheritance trail actions
  setInheritanceTrailNodeId: (nodeId: string | null) => void;
  clearInheritanceTrail: () => void;
  
  // View centering actions
  centerViewOnNode: (nodeId: string) => void;
  clearCenterViewRequest: () => void;
  
  // Show All Policy Badges actions
  setShowAllPolicyBadges: (show: boolean) => void;
  toggleShowAllPolicyBadges: () => void;
  
  // Tutorial actions
  setTutorialActive: (active: boolean) => void;
  setTutorialCompleted: (completed: boolean) => void;
  
  // ReactFlow instance actions
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  downloadOrganizationImage: () => Promise<void>;
  
  // Utility actions
  resetUI: () => void;
  
  // Helper functions
  hasActiveOperations: () => boolean;
  getOperationsByType: (type: LoadingOperation['type']) => LoadingOperation[];
  // Toast functionality moved to Sonner
}

/**
 * Generate unique ID for operations and toasts
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;



/**
 * Detect if device is mobile based on screen width
 * Uses same logic as useIsMobile hook (768px breakpoint)
 */
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768; // md breakpoint - matches useIsMobile hook
};

/**
 * Create UI slice
 */
export const createUISlice: StateCreator<
  AppState,
  [],
  [],
  UISlice
> = (set, get) => ({
  // Initial state
  loadingOperations: [],
  errors: [],
  viewMode: 'tree',
  sidebarOpen: !isMobileDevice(), // Close sidebar by default on mobile
  selectedPolicyType: null,
  showInheritedPolicies: true,
  draggedNodeId: null,
  showErrorPanel: false,
  inheritanceTrailNodeId: null,
  centerViewOnNodeId: null,
  showAllPolicyBadges: false,
  tutorialActive: false,
  tutorialCompleted: false,
  reactFlowInstance: null,

  // Loading actions
  startLoadingOperation: (operation) => {
    const id = generateId();
    const { loadingOperations } = get();
    const newOperation: LoadingOperation = {
      ...operation,
      id,
      startedAt: new Date(),
    };
    
    set({ 
      loadingOperations: [...loadingOperations, newOperation],
    });
    
    return id;
  },

  updateLoadingOperation: (id, updates) => {
    const { loadingOperations } = get();
    const updatedOperations = loadingOperations.map(op =>
      op.id === id ? { ...op, ...updates } : op
    );
    set({ loadingOperations: updatedOperations });
  },

  finishLoadingOperation: (id) => {
    const { loadingOperations } = get();
    const updatedOperations = loadingOperations.filter(op => op.id !== id);
    set({ 
      loadingOperations: updatedOperations,
    });
  },

  clearLoadingOperations: () => {
    set({ loadingOperations: [] });
  },

  // Error actions
  addError: (error: string) => {
    const { errors } = get();
    set({ errors: [...errors, error] });
  },

  removeError: (index: number) => {
    const { errors } = get();
    const updatedErrors = errors.filter((_, i) => i !== index);
    set({ errors: updatedErrors });
  },

  clearErrors: () => {
    set({ errors: [] });
  },

  // Toast functionality moved to Sonner

  // View mode actions
  setViewMode: (mode: 'tree' | 'list') => {
    set({ viewMode: mode });
  },

  toggleSidebar: () => {
    const { sidebarOpen } = get();
    set({ sidebarOpen: !sidebarOpen });
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },

  toggleErrorPanel: () => {
    const { showErrorPanel } = get();
    set({ showErrorPanel: !showErrorPanel });
  },

  setShowErrorPanel: (show: boolean) => {
    set({ showErrorPanel: show });
  },

  // Policy management UI actions
  setSelectedPolicyType: (type: 'scp' | 'rcp' | null) => {
    set({ selectedPolicyType: type });
  },

  toggleShowInheritedPolicies: () => {
    const { showInheritedPolicies } = get();
    set({ showInheritedPolicies: !showInheritedPolicies });
  },

  setShowInheritedPolicies: (show: boolean) => {
    set({ showInheritedPolicies: show });
  },

  // Drag and drop actions
  setDraggedNodeId: (nodeId: string | null) => {
    set({ draggedNodeId: nodeId });
  },

  // Inheritance trail actions
  setInheritanceTrailNodeId: (nodeId: string | null) => {
    set({ inheritanceTrailNodeId: nodeId });
  },

  clearInheritanceTrail: () => {
    set({ inheritanceTrailNodeId: null });
  },

  // View centering actions
  centerViewOnNode: (nodeId: string) => {
    set({ centerViewOnNodeId: nodeId });
  },

  clearCenterViewRequest: () => {
    set({ centerViewOnNodeId: null });
  },

  // Show All Policy Badges actions
  setShowAllPolicyBadges: (show: boolean) => {
    set({ showAllPolicyBadges: show });
  },

  toggleShowAllPolicyBadges: () => {
    const { showAllPolicyBadges } = get();
    set({ showAllPolicyBadges: !showAllPolicyBadges });
  },

  // Tutorial actions
  setTutorialActive: (active: boolean) => {
    set({ tutorialActive: active });
  },

  setTutorialCompleted: (completed: boolean) => {
    set({ tutorialCompleted: completed });
    // Persist to localStorage
    getPersistenceManager().saveTutorialCompleted(completed);
  },

  // ReactFlow instance actions
  setReactFlowInstance: (instance: ReactFlowInstance | null) => {
    set({ reactFlowInstance: instance });
  },

  downloadOrganizationImage: async () => {
    const { reactFlowInstance, organization } = get();
    
    if (!reactFlowInstance || !organization) {
      throw new Error('ReactFlow instance or organization not available');
    }

    const filename = generateImageFilename(organization.name);
    await downloadImage(reactFlowInstance, filename);
  },

  // Utility actions
  resetUI: () => {
    set({
      loadingOperations: [],
      errors: [],
      viewMode: 'tree',
      sidebarOpen: !isMobileDevice(), // Respect mobile state on reset
      selectedPolicyType: null,
      showInheritedPolicies: true,
      draggedNodeId: null,
      showErrorPanel: false,
      inheritanceTrailNodeId: null,
      centerViewOnNodeId: null,
      showAllPolicyBadges: false,
      tutorialActive: false,
      // Don't reset tutorialCompleted on UI reset
    });
  },

  // Helper functions
  hasActiveOperations: () => {
    const { loadingOperations } = get();
    return loadingOperations.length > 0;
  },

  getOperationsByType: (type) => {
    const { loadingOperations } = get();
    return loadingOperations.filter(op => op.type === type);
  },

  // Toast functionality moved to Sonner
});