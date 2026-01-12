/**
 * Persistence state slice for export/import functionality
 */

import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import type { AppState } from './index';
import { getPersistenceManager } from '../lib/persistence';

/**
 * Persistence state and actions
 */
export interface PersistenceSlice {
  // State
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  isInitialized: boolean;

  // Export/Import actions
  exportOrganization: (filename?: string) => Promise<void>;
  importOrganization: (file: File, silent?: boolean) => Promise<boolean>;
  clearOrganization: (silent?: boolean) => void;
  getOrganizationVersion: () => string;
  
  // Auto-persistence actions
  initializeFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
}

/**
 * Create persistence slice
 */
export const createPersistenceSlice: StateCreator<
  AppState,
  [],
  [],
  PersistenceSlice
> = (set, get) => ({
  // Initial state
  isLoading: false,
  isSaving: false,
  saveError: null,
  isInitialized: false,

  exportOrganization: async (filename?: string) => {
    const state = get();
    const { organization, policies, policyAttachments } = state;
    
    if (!organization) {
      throw new Error('No organization to export');
    }
    
    set({ isSaving: true, saveError: null });
    
    try {
      const persistenceManager = getPersistenceManager();
      await persistenceManager.exportState(organization, policies, policyAttachments, filename);
      
      // Show success notification
      toast.success('Export Successful', {
        description: `Organization "${organization.name}" has been exported successfully.`
      });
    } catch (error) {
      console.error('Failed to export organization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ saveError: 'Failed to export organization' });
      
      // Show error notification
      toast.error('Export Failed', {
        description: `Failed to export organization: ${errorMessage}`
      });
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  importOrganization: async (file: File, silent = false) => {
    set({ isLoading: true, saveError: null });
    
    try {
      // Add a small delay to show the loading screen
      await new Promise(resolve => setTimeout(resolve, 1000));
      const persistenceManager = getPersistenceManager();
      const importedState = await persistenceManager.importState(file);
      
      // Check if default policies exist in imported data
      const defaultSCPId = 'default-scp-full-access';
      const defaultRCPId = 'default-rcp-full-access';
      
      const hasDefaultSCP = importedState.policies[defaultSCPId];
      const hasDefaultRCP = importedState.policies[defaultRCPId];
      
      const finalPolicies = { ...importedState.policies };
      const finalAttachments = [...importedState.policyAttachments];
      
      // Create default policies if they don't exist in imported data
      if (!hasDefaultSCP || !hasDefaultRCP) {
        const rootId = importedState.organization.rootId;
        
        if (!hasDefaultSCP) {
          const defaultSCP = {
            id: defaultSCPId,
            name: 'FullAWSAccess',
            type: 'scp' as const,
            content: '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": "*","Resource": "*"}]}',
            createdAt: new Date(),
            lastModified: new Date(),
          };
          
          finalPolicies[defaultSCPId] = defaultSCP;
          
          // Create attachment
          finalAttachments.push({
            policyId: defaultSCPId,
            nodeId: rootId,
            attachedAt: new Date(),
          });
        }
        
        if (!hasDefaultRCP) {
          const defaultRCP = {
            id: defaultRCPId,
            name: 'RCPFullAWSAccess',
            type: 'rcp' as const,
            content: '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Principal": "*","Action": "*","Resource": "*"}]}',
            createdAt: new Date(),
            lastModified: new Date(),
          };
          
          finalPolicies[defaultRCPId] = defaultRCP;
          
          // Create attachment
          finalAttachments.push({
            policyId: defaultRCPId,
            nodeId: rootId,
            attachedAt: new Date(),
          });
        }
      }
      
      // Update store with imported state (including any created default policies)
      set({
        organization: importedState.organization,
        policies: finalPolicies,
        policyAttachments: finalAttachments,
      });

      // Rebuild Policy Data Cache from imported source data
      get().refreshAllNodesPolicyData();
      
      // Show success notification only if not silent
      if (!silent) {
        toast.success('Import Successful', {
          description: `Organization "${importedState.organization.name}" has been imported successfully.`
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import organization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ saveError: `Failed to import organization: ${errorMessage}` });
      
      // Show error notification only if not silent
      if (!silent) {
        toast.error('Import Failed', {
          description: `Failed to import organization: ${errorMessage}`
        });
      }
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  clearOrganization: (silent = false) => {
    // Reset the application to no organization state
    set({
      organization: null,
      policies: {},
      policyAttachments: [],
      selectedNodeId: null,
      saveError: null,
      // Reset UI toggles to default state
      selectedPolicyType: null,
      showInheritedPolicies: true,
      showErrorPanel: false,
      inheritanceTrailNodeId: null,
      centerViewOnNodeId: null,
      showAllPolicyBadges: false,
      draggedNodeId: null,
    });
    
    // Reset organization version and clear localStorage
    const persistenceManager = getPersistenceManager();
    persistenceManager.setOrganizationVersion('1.0');
    persistenceManager.clearLocalStorage();
    console.log('🗑️ Cleared localStorage and reset application state');
    
    // Show success notification unless silent
    if (!silent) {
      toast.success('Organization Cleared', {
        description: 'The application has been reset to no organization state.'
      });
    }
  },

  getOrganizationVersion: () => {
    const persistenceManager = getPersistenceManager();
    return persistenceManager.getCurrentOrganizationVersion();
  },

  initializeFromLocalStorage: () => {
    if (get().isInitialized) {
      return; // Already initialized
    }

    try {
      const persistenceManager = getPersistenceManager();
      const storedState = persistenceManager.loadFromLocalStorage();
      
      // Load tutorial completion status
      const tutorialCompleted = persistenceManager.loadTutorialCompleted();
      
      if (storedState) {
        // Check if default policies exist in stored data
        const defaultSCPId = 'default-scp-full-access';
        const defaultRCPId = 'default-rcp-full-access';
        
        const hasDefaultSCP = storedState.policies[defaultSCPId];
        const hasDefaultRCP = storedState.policies[defaultRCPId];
        
        const finalPolicies = { ...storedState.policies };
        const finalAttachments = [...storedState.policyAttachments];
        
        // Create default policies if they don't exist in stored data
        if (!hasDefaultSCP || !hasDefaultRCP) {
          const rootId = storedState.organization.rootId;
          
          if (!hasDefaultSCP) {
            const defaultSCP = {
              id: defaultSCPId,
              name: 'FullAWSAccess',
              type: 'scp' as const,
              content: '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": "*","Resource": "*"}]}',
              createdAt: new Date(),
              lastModified: new Date(),
            };
            
            finalPolicies[defaultSCPId] = defaultSCP;
            
            // Create attachment
            finalAttachments.push({
              policyId: defaultSCPId,
              nodeId: rootId,
              attachedAt: new Date(),
            });
          }
          
          if (!hasDefaultRCP) {
            const defaultRCP = {
              id: defaultRCPId,
              name: 'RCPFullAWSAccess',
              type: 'rcp' as const,
              content: '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Principal": "*","Action": "*","Resource": "*"}]}',
              createdAt: new Date(),
              lastModified: new Date(),
            };
            
            finalPolicies[defaultRCPId] = defaultRCP;
            
            // Create attachment
            finalAttachments.push({
              policyId: defaultRCPId,
              nodeId: rootId,
              attachedAt: new Date(),
            });
          }
        }
        
        // Update store with stored state
        set({
          organization: storedState.organization,
          policies: finalPolicies,
          policyAttachments: finalAttachments,
          isInitialized: true,
          tutorialCompleted,
        });

        // Rebuild Policy Data Cache from loaded source data
        get().refreshAllNodesPolicyData();
        
        console.log('✅ Successfully restored state from localStorage:', {
          organizationName: storedState.organization.name,
          nodeCount: Object.keys(storedState.organization.nodes).length,
          policyCount: Object.keys(finalPolicies).length,
          version: storedState.version
        });
      } else {
        // No stored state, just mark as initialized
        console.log('ℹ️ No stored state found in localStorage - starting fresh');
        set({ 
          isInitialized: true,
          tutorialCompleted,
        });
      }
    } catch (error) {
      console.error('Failed to initialize from localStorage:', error);
      set({ isInitialized: true }); // Mark as initialized even if failed
    }
  },

  saveToLocalStorage: () => {
    const state = get();
    if (!state.isInitialized) {
      return; // Don't save until initialized
    }

    const { organization, policies, policyAttachments } = state;
    
    try {
      const persistenceManager = getPersistenceManager();
      persistenceManager.saveToLocalStorage(organization, policies, policyAttachments);
      console.log('💾 Auto-saved to localStorage:', {
        organizationName: organization?.name || 'None',
        nodeCount: organization ? Object.keys(organization.nodes).length : 0,
        policyCount: Object.keys(policies).length
      });
    } catch (error) {
      console.warn('❌ Failed to save to localStorage:', error);
      // Don't show user error for localStorage failures
    }
  },

});