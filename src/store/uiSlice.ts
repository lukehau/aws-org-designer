/**
 * UI state slice for selection and view modes with comprehensive error handling
 */

import type { StateCreator } from 'zustand';
import type { AppState } from './index';
import type { ReactFlowInstance } from '@xyflow/react';
import { getPersistenceManager } from '@/lib/persistence';
import { downloadImage, generateImageFilename } from '@/utils/downloadImage';

/**
 * UI state and actions
 */
export interface UISlice {
  // State
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
}

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
});