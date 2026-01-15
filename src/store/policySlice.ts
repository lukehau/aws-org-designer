/**
 * Policy state slice with SCP and RCP management
 */

import type { StateCreator } from 'zustand';
import type { Policy, PolicyAttachment, InheritedPolicies } from '../types/policy';
import type { AppState } from './index';

/**
 * Policy state and actions
 */
export interface PolicySlice {
  // State
  policies: Record<string, Policy>;
  policyAttachments: PolicyAttachment[];
  allNodesPolicyData: Array<{ nodeId: string; scps: Array<{ id: string; name: string }>; rcps: Array<{ id: string; name: string }> }>;
  inheritanceTrailCache: Map<string, Array<{ nodeId: string; scps: Array<{ id: string; name: string }>; rcps: Array<{ id: string; name: string }> }>>;

  // Policy CRUD actions
  createPolicy: (policy: Omit<Policy, 'id' | 'createdAt' | 'lastModified'>) => string;
  updatePolicy: (policyId: string, updates: Partial<Policy>) => void;
  deletePolicy: (policyId: string) => void;
  
  // Policy attachment actions
  attachPolicy: (nodeId: string, policyId: string) => void;
  detachPolicy: (nodeId: string, policyId: string) => void;
  
  // Query functions
  getPolicy: (policyId: string) => Policy | null;
  getPoliciesByType: (type: 'scp' | 'rcp') => Policy[];
  getNodeAttachedPolicies: (nodeId: string, type?: 'scp' | 'rcp') => Policy[];
  getNodeInheritedPolicies: (nodeId: string) => InheritedPolicies;
  getNodeDirectPolicyAttachments: (nodeId: string) => PolicyAttachment[];
  
  // Utility functions
  isPolicyAttachedToNode: (nodeId: string, policyId: string) => boolean;
  canDetachPolicy: (nodeId: string, policyId: string) => boolean;
  isPolicyNameTaken: (name: string, type: 'scp' | 'rcp', excludePolicyId?: string) => boolean;
  
  // Comprehensive policy data management
  refreshAllNodesPolicyData: () => void;
  refreshInheritanceTrailCache: (nodeId: string) => void;
  clearInheritanceTrailCache: () => void;
}

/**
 * Generate unique ID for policies
 */
const generatePolicyId = (): string => {
  return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create policy slice
 */
export const createPolicySlice: StateCreator<
  AppState,
  [],
  [],
  PolicySlice
> = (set, get) => ({
  // Initial state
  policies: {},
  policyAttachments: [],
  allNodesPolicyData: [],
  inheritanceTrailCache: new Map(),

  // Policy CRUD actions
  createPolicy: (policyData) => {
    const policyId = generatePolicyId();
    const policy: Policy = {
      ...policyData,
      id: policyId,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    set(state => ({
      policies: {
        ...state.policies,
        [policyId]: policy,
      },
    }));

    return policyId;
  },

  updatePolicy: (policyId: string, updates: Partial<Policy>) => {
    const { policies } = get();
    const existingPolicy = policies[policyId];
    
    if (!existingPolicy) return;

    const updatedPolicy = {
      ...existingPolicy,
      ...updates,
      lastModified: new Date(),
    };

    set({
      policies: {
        ...policies,
        [policyId]: updatedPolicy,
      },
    });
  },

  deletePolicy: (policyId: string) => {
    const { policies, policyAttachments } = get();
    
    // Remove policy from policies
    const updatedPolicies = { ...policies };
    delete updatedPolicies[policyId];

    // Remove all attachments for this policy
    const updatedAttachments = policyAttachments.filter(
      attachment => attachment.policyId !== policyId
    );

    set({
      policies: updatedPolicies,
      policyAttachments: updatedAttachments,
    });
  },

  // Policy attachment actions
  attachPolicy: (nodeId: string, policyId: string) => {
    const state = get();
    const { policyAttachments, validatePolicyAttachment, organization, getPolicy } = state;
    
    // Validate before attaching
    const validation = validatePolicyAttachment(nodeId, policyId);
    if (!validation.isValid) {
      // Validation errors will be handled by the validation slice
      return;
    }

    // Check if already attached
    const isAlreadyAttached = policyAttachments.some(
      attachment => attachment.nodeId === nodeId && attachment.policyId === policyId
    );

    if (isAlreadyAttached) return;

    // Get the policy to determine its type
    const policy = getPolicy(policyId);
    if (!policy || !organization) return;

    const newAttachment: PolicyAttachment = {
      policyId,
      nodeId,
      attachedAt: new Date(),
    };

    // Update policyAttachments array (single source of truth)
    set((state) => ({
      ...state,
      policyAttachments: [...state.policyAttachments, newAttachment],
    }));

    // Refresh comprehensive policy data for immediate visualization updates
    const currentState = get();
    currentState.refreshAllNodesPolicyData();
    currentState.clearInheritanceTrailCache();
  },

  detachPolicy: (nodeId: string, policyId: string) => {
    const state = get();
    const { validatePolicyDetachment, organization, getPolicy } = state;
    
    // Validate before detaching
    const validation = validatePolicyDetachment(nodeId, policyId);
    if (!validation.isValid) {
      // Validation errors will be handled by the validation slice
      return;
    }

    // Get the policy to determine its type
    const policy = getPolicy(policyId);
    if (!policy || !organization) return;

    // Update policyAttachments array (single source of truth)
    set((state) => ({
      ...state,
      policyAttachments: state.policyAttachments.filter(
        attachment => !(attachment.nodeId === nodeId && attachment.policyId === policyId)
      ),
    }));

    // Refresh comprehensive policy data for immediate visualization updates
    const currentState = get();
    currentState.refreshAllNodesPolicyData();
    currentState.clearInheritanceTrailCache();
  },

  // Query functions
  getPolicy: (policyId: string) => {
    const { policies } = get();
    return policies[policyId] || null;
  },

  getPoliciesByType: (type: 'scp' | 'rcp') => {
    const { policies } = get();
    return Object.values(policies).filter(policy => policy.type === type);
  },

  getNodeAttachedPolicies: (nodeId: string, type?: 'scp' | 'rcp') => {
    const { policies, policyAttachments } = get();
    
    const attachedPolicyIds = policyAttachments
      .filter(attachment => attachment.nodeId === nodeId)
      .map(attachment => attachment.policyId);

    const attachedPolicies = attachedPolicyIds
      .map(policyId => policies[policyId])
      .filter(Boolean);

    return type ? attachedPolicies.filter(policy => policy.type === type) : attachedPolicies;
  },

  getNodeInheritedPolicies: (nodeId: string) => {
    const state = get();
    const { getNodePath, getNodeAttachedPolicies } = state;
    
    const nodePath = getNodePath(nodeId);
    const directPolicies = getNodeAttachedPolicies(nodeId);
    
    const inheritedPolicies: InheritedPolicies = {
      nodeId,
      directPolicies: {
        scps: directPolicies.filter(p => p.type === 'scp'),
        rcps: directPolicies.filter(p => p.type === 'rcp'),
      },
      inheritedPolicies: {
        scps: [],
        rcps: [],
      },
      effectivePolicies: {
        scps: [],
        rcps: [],
      },
    };

    // Collect inherited policies from parent nodes (excluding the current node)
    // Process from root to immediate parent to maintain inheritance order
    const parentNodes = nodePath.slice(0, -1);
    
    parentNodes.forEach(parentNode => {
      const parentPolicies = getNodeAttachedPolicies(parentNode.id);
      
      parentPolicies.forEach(policy => {
        if (policy.type === 'scp') {
          // Check if this policy is already inherited from a higher parent
          const alreadyInherited = inheritedPolicies.inheritedPolicies.scps.some(
            item => item.policy.id === policy.id
          );
          if (!alreadyInherited) {
            inheritedPolicies.inheritedPolicies.scps.push({
              policy,
              inheritedFrom: parentNode.id,
            });
          }
        } else if (policy.type === 'rcp') {
          // Check if this policy is already inherited from a higher parent
          const alreadyInherited = inheritedPolicies.inheritedPolicies.rcps.some(
            item => item.policy.id === policy.id
          );
          if (!alreadyInherited) {
            inheritedPolicies.inheritedPolicies.rcps.push({
              policy,
              inheritedFrom: parentNode.id,
            });
          }
        }
      });
    });

    // Calculate effective policies (direct + inherited, removing duplicates)

    inheritedPolicies.effectivePolicies.scps = [
      ...inheritedPolicies.directPolicies.scps,
      ...inheritedPolicies.inheritedPolicies.scps
        .filter(item => !inheritedPolicies.directPolicies.scps.some(p => p.id === item.policy.id))
        .map(item => item.policy),
    ];

    inheritedPolicies.effectivePolicies.rcps = [
      ...inheritedPolicies.directPolicies.rcps,
      ...inheritedPolicies.inheritedPolicies.rcps
        .filter(item => !inheritedPolicies.directPolicies.rcps.some(p => p.id === item.policy.id))
        .map(item => item.policy),
    ];

    return inheritedPolicies;
  },

  getNodeDirectPolicyAttachments: (nodeId: string) => {
    const { policyAttachments } = get();
    return policyAttachments.filter(attachment => attachment.nodeId === nodeId);
  },

  // Utility functions
  isPolicyAttachedToNode: (nodeId: string, policyId: string) => {
    const { policyAttachments } = get();
    return policyAttachments.some(
      attachment => attachment.nodeId === nodeId && attachment.policyId === policyId
    );
  },

  canDetachPolicy: (nodeId: string, policyId: string) => {
    const state = get();
    const { validatePolicyDetachment } = state;
    const validation = validatePolicyDetachment(nodeId, policyId);
    return validation.isValid;
  },

  isPolicyNameTaken: (name: string, type: 'scp' | 'rcp', excludePolicyId?: string) => {
    const { policies } = get();
    const normalizedName = name.trim().toLowerCase();
    
    return Object.values(policies).some(policy => 
      policy.type === type && 
      policy.id !== excludePolicyId &&
      policy.name.trim().toLowerCase() === normalizedName
    );
  },

  refreshAllNodesPolicyData: () => {
    const state = get();
    const { organization, getNodeAttachedPolicies } = state;
    
    if (!organization) {
      set({ allNodesPolicyData: [] });
      return;
    }
    
    const allNodeData: Array<{ nodeId: string; scps: Array<{ id: string; name: string }>; rcps: Array<{ id: string; name: string }> }> = [];
    
    // Process ALL nodes in the organization
    Object.values(organization.nodes).forEach(node => {
      const attachedPolicies = getNodeAttachedPolicies(node.id);
      const scps = attachedPolicies
        .filter(p => p.type === 'scp')
        .map(p => ({ id: p.id, name: p.name }));
      const rcps = attachedPolicies
        .filter(p => p.type === 'rcp')
        .map(p => ({ id: p.id, name: p.name }));
      
      // Only include nodes that have policies attached
      if (scps.length > 0 || rcps.length > 0) {
        allNodeData.push({
          nodeId: node.id,
          scps,
          rcps,
        });
      }
    });
    
    set({ allNodesPolicyData: allNodeData });
  },

  refreshInheritanceTrailCache: (nodeId: string) => {
    const state = get();
    const { getNodePath, getNodeAttachedPolicies, inheritanceTrailCache } = state;
    
    const nodePath = getNodePath(nodeId);
    const trailData: Array<{ nodeId: string; scps: Array<{ id: string; name: string }>; rcps: Array<{ id: string; name: string }> }> = [];
    
    // Process ALL nodes in the path (including the selected node itself)
    nodePath.forEach(pathNode => {
      const attachedPolicies = getNodeAttachedPolicies(pathNode.id);
      const scps = attachedPolicies
        .filter(p => p.type === 'scp')
        .map(p => ({ id: p.id, name: p.name }));
      const rcps = attachedPolicies
        .filter(p => p.type === 'rcp')
        .map(p => ({ id: p.id, name: p.name }));
      
      // Only include nodes that have policies attached
      if (scps.length > 0 || rcps.length > 0) {
        trailData.push({
          nodeId: pathNode.id,
          scps,
          rcps,
        });
      }
    });
    
    // Update the cache
    const newCache = new Map(inheritanceTrailCache);
    newCache.set(nodeId, trailData);
    set({ inheritanceTrailCache: newCache });
  },

  clearInheritanceTrailCache: () => {
    set({ inheritanceTrailCache: new Map() });
  },
});