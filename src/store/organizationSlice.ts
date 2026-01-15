/**
 * Organization state slice with CRUD operations for nodes
 */

import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import type { 
  Organization, 
  OrganizationNode, 
  OrganizationLimits 
} from '../types/organization';
import type { AppState } from './index';

/**
 * Default AWS organization limits
 */
const DEFAULT_LIMITS: OrganizationLimits = {
  maxAccounts: 10, // Default 10, adjustable to 10,000
  maxOUs: 2000,
  maxNestingLevels: 5,
  maxSCPsPerNode: 5,
  maxRCPsPerNode: 5,
  maxPolicySize: 5120,
};

/**
 * Organization state and actions
 */
export interface OrganizationSlice {
  // State
  organization: Organization | null;
  selectedNodeId: string | null;

  // Actions
  createOrganization: (name: string) => void;
  addNode: (parentId: string, type: 'ou' | 'account', name: string) => void;
  updateNode: (nodeId: string, updates: Partial<OrganizationNode>) => void;
  renameNode: (nodeId: string, newName: string) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  selectNode: (nodeId: string | null) => void;
  
  // Utility functions
  getNode: (nodeId: string) => OrganizationNode | null;
  getNodeChildren: (nodeId: string) => OrganizationNode[];
  getNodePath: (nodeId: string) => OrganizationNode[];
  getNestingLevel: (nodeId: string) => number;
  getAccountCount: () => number;
  getOUCount: () => number;
}

/**
 * Generate unique ID for nodes
 */
const generateNodeId = (): string => {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate unique ID for organizations
 */
const generateOrgId = (): string => {
  return `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create organization slice
 */
export const createOrganizationSlice: StateCreator<
  AppState,
  [],
  [],
  OrganizationSlice
> = (set, get) => ({
  // Initial state
  organization: null,
  selectedNodeId: null,

  // Actions
  createOrganization: (name: string) => {
    const rootId = generateNodeId();
    const orgId = generateOrgId();
    
    // Create default policies with predictable IDs
    const defaultSCPId = 'default-scp-full-access';
    const defaultRCPId = 'default-rcp-full-access';
    
    const defaultSCP = {
      id: defaultSCPId,
      name: 'FullAWSAccess',
      type: 'scp' as const,
      content: '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": "*","Resource": "*"}]}',
      createdAt: new Date(),
      lastModified: new Date(),
    };
    
    const defaultRCP = {
      id: defaultRCPId,
      name: 'RCPFullAWSAccess',
      type: 'rcp' as const,
      content: '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Principal": "*","Action": "*","Resource": "*"}]}',
      createdAt: new Date(),
      lastModified: new Date(),
    };
    
    const rootNode: OrganizationNode = {
      id: rootId,
      name: name,
      type: 'root',
      parentId: null,
      children: [],
      position: { x: 0, y: 0 },
      metadata: {
        createdAt: new Date(),
        lastModified: new Date(),
      },
    };

    const organization: Organization = {
      id: orgId,
      name,
      rootId,
      nodes: {
        [rootId]: rootNode,
      },
      limits: { ...DEFAULT_LIMITS },
    };

    // Create default policy attachments
    const defaultSCPAttachment = {
      policyId: defaultSCPId,
      nodeId: rootId,
      attachedAt: new Date(),
    };
    
    const defaultRCPAttachment = {
      policyId: defaultRCPId,
      nodeId: rootId,
      attachedAt: new Date(),
    };

    set({ 
      organization, 
      selectedNodeId: rootId,
      policies: {
        [defaultSCPId]: defaultSCP,
        [defaultRCPId]: defaultRCP,
      },
      policyAttachments: [defaultSCPAttachment, defaultRCPAttachment],
    });

    // Refresh policy data cache so policy badges work immediately
    get().refreshAllNodesPolicyData();
  },

  addNode: (parentId: string, type: 'ou' | 'account', name: string) => {
    const state = get();
    const { organization, validateNodeCreation } = state;
    
    if (!organization) return;

    // Validate before creating
    const validation = validateNodeCreation(parentId, type);
    if (!validation.isValid) {
      // Show validation error toast to user
      if (validation.errors.length === 1) {
        const error = validation.errors[0];
        toast.error(error.message);
      } else {
        toast.error('Cannot Create Node', {
          description: `Found ${validation.errors.length} validation issues.`,
        });
      }
      return;
    }

    const nodeId = generateNodeId();
    const parentNode = organization.nodes[parentId];
    
    if (!parentNode) return;

    const LAYOUT_CONFIG = {
      rankSep: 160, // Vertical spacing
      minHorizontalGap: 60, // Increased minimum gap between nodes for better separation
    };

    // Calculate position with dynamic width consideration
    const calculateNewNodePosition = (parent: OrganizationNode, newNodeName: string) => {
      const baseY = parent.position.y + LAYOUT_CONFIG.rankSep;
      
      // If this is the first child, center it under the parent
      if (parent.children.length === 0) {
        return {
          x: parent.position.x,
          y: baseY
        };
      }
      
      // Find the rightmost existing sibling and calculate spacing
      const existingSiblings = parent.children.map(childId => organization.nodes[childId]).filter(Boolean);
      if (existingSiblings.length === 0) {
        return {
          x: parent.position.x,
          y: baseY
        };
      }
      
      const rightmostSibling = existingSiblings.reduce((rightmost, sibling) => 
        sibling.position.x > rightmost.position.x ? sibling : rightmost
      );
      
      // Calculate spacing based on the rightmost sibling's estimated width
      const rightmostSiblingWidth = estimateNodeWidth(rightmostSibling.name);
      const newNodeWidth = estimateNodeWidth(newNodeName);
      
      // Position new node with proper spacing: 
      // rightmost sibling position + half its width + gap + half new node width
      let newNodeX = rightmostSibling.position.x + (rightmostSiblingWidth / 2) + LAYOUT_CONFIG.minHorizontalGap + (newNodeWidth / 2);
      
      // Check for conflicts with nodes from other branches
      const allNodes = Object.values(organization.nodes);
      const conflictingNodes = allNodes.filter(node => 
        Math.abs(node.position.y - baseY) < LAYOUT_CONFIG.rankSep / 2 && // Same level
        node.id !== parent.id && // Not the parent
        !parent.children.includes(node.id) // Not an existing sibling
      );
      
      // If there are conflicts, position after the rightmost conflict
      if (conflictingNodes.length > 0) {
        const rightmostConflict = conflictingNodes.reduce((rightmost, node) => 
          node.position.x > rightmost.position.x ? node : rightmost
        );
        const conflictWidth = estimateNodeWidth(rightmostConflict.name);
        newNodeX = Math.max(newNodeX, rightmostConflict.position.x + (conflictWidth / 2) + LAYOUT_CONFIG.minHorizontalGap + (newNodeWidth / 2));
      }
      
      return {
        x: newNodeX,
        y: baseY
      };
    };

    // Estimate node width based on text length for better spacing
    const estimateNodeWidth = (nodeName: string): number => {
      // Base width for the minimum node size (120px min-width + padding + icon + margins)
      const baseWidth = 180;
      // Estimate ~10px per character for the text (more generous approximation)
      const textWidth = nodeName.length * 10;
      // Add generous padding and margin for safety
      const estimatedWidth = Math.max(baseWidth, textWidth + 120);
      return estimatedWidth;
    };

    const newPosition = calculateNewNodePosition(parentNode, name);

    const newNode: OrganizationNode = {
      id: nodeId,
      name,
      type,
      parentId,
      children: [],
      position: newPosition,
      metadata: {
        createdAt: new Date(),
        lastModified: new Date(),
      },
    };

    // Optimized update - batch the changes
    set((state) => {
      if (!state.organization) return state;
      
      const updatedNodes = { ...state.organization.nodes };
      updatedNodes[nodeId] = newNode;
      
      // Update parent with new child
      const updatedParent = {
        ...updatedNodes[parentId],
        children: [...updatedNodes[parentId].children, nodeId],
        metadata: {
          ...updatedNodes[parentId].metadata,
          lastModified: new Date(),
        },
      };
      updatedNodes[parentId] = updatedParent;

      // Don't reposition existing siblings - just add the new node
      // This prevents accidentally moving nodes from other branches
      // Users can use auto-arrange if they want to reposition everything

      return {
        ...state,
        organization: {
          ...state.organization,
          nodes: updatedNodes,
        },
      };
    });
  },

  updateNode: (nodeId: string, updates: Partial<OrganizationNode>) => {
    set((state) => {
      if (!state.organization || !state.organization.nodes[nodeId]) return state;

      const currentNode = state.organization.nodes[nodeId];
      const updatedNode = {
        ...currentNode,
        ...updates,
        metadata: {
          ...currentNode.metadata,
          lastModified: new Date(),
        },
      };

      return {
        ...state,
        organization: {
          ...state.organization,
          nodes: {
            ...state.organization.nodes,
            [nodeId]: updatedNode,
          },
        },
      };
    });
  },

  renameNode: (nodeId: string, newName: string) => {
    const { updateNode } = get();
    const trimmedName = newName.trim();
    
    if (!trimmedName) return; // Don't allow empty names
    
    updateNode(nodeId, { name: trimmedName });
  },

  deleteNode: (nodeId: string) => {
    const { organization } = get();
    if (!organization || !organization.nodes[nodeId]) return;

    const nodeToDelete = organization.nodes[nodeId];
    
    // Cannot delete root node
    if (nodeToDelete.type === 'root') return;

    // Remove from parent's children array
    const parentNode = nodeToDelete.parentId ? organization.nodes[nodeToDelete.parentId] : null;
    if (parentNode) {
      const updatedParent = {
        ...parentNode,
        children: parentNode.children.filter(childId => childId !== nodeId),
        metadata: {
          ...parentNode.metadata,
          lastModified: new Date(),
        },
      };

      const updatedNodes = { ...organization.nodes };
      updatedNodes[parentNode.id] = updatedParent;

      // Remove the node and all its children recursively
      const nodesToDelete = [nodeId];
      const collectChildNodes = (id: string) => {
        const node = organization.nodes[id];
        if (node) {
          node.children.forEach(childId => {
            nodesToDelete.push(childId);
            collectChildNodes(childId);
          });
        }
      };
      collectChildNodes(nodeId);

      // Delete all collected nodes
      nodesToDelete.forEach(id => {
        delete updatedNodes[id];
      });

      set({
        organization: {
          ...organization,
          nodes: updatedNodes,
        },
        selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      });
    }
  },

  moveNode: (nodeId: string, newParentId: string) => {
    const { organization, validateNodeCreation } = get();
    if (!organization || !organization.nodes[nodeId] || !organization.nodes[newParentId]) return;

    const nodeToMove = organization.nodes[nodeId];
    const newParent = organization.nodes[newParentId];
    
    // Cannot move root node
    if (nodeToMove.type === 'root') return;
    
    // Cannot move node to itself or its descendants
    if (nodeId === newParentId) return;
    
    // Check if newParent is a descendant of nodeToMove (would create a cycle)
    const isDescendant = (ancestorId: string, descendantId: string): boolean => {
      const descendant = organization.nodes[descendantId];
      if (!descendant || !descendant.parentId) return false;
      if (descendant.parentId === ancestorId) return true;
      return isDescendant(ancestorId, descendant.parentId);
    };
    
    if (isDescendant(nodeId, newParentId)) return;
    
    // Validate the move (check limits, nesting, etc.)
    const validation = validateNodeCreation(newParentId, nodeToMove.type);
    if (!validation.isValid) return;

    const oldParentId = nodeToMove.parentId;
    if (!oldParentId || oldParentId === newParentId) return; // Already in the right place

    const oldParent = organization.nodes[oldParentId];
    if (!oldParent) return;

    // Update the nodes
    const updatedNodes = { ...organization.nodes };
    
    // Remove from old parent's children
    updatedNodes[oldParentId] = {
      ...oldParent,
      children: oldParent.children.filter(childId => childId !== nodeId),
      metadata: {
        ...oldParent.metadata,
        lastModified: new Date(),
      },
    };
    
    // Add to new parent's children
    updatedNodes[newParentId] = {
      ...newParent,
      children: [...newParent.children, nodeId],
      metadata: {
        ...newParent.metadata,
        lastModified: new Date(),
      },
    };
    
    // Update the moved node's parentId
    updatedNodes[nodeId] = {
      ...nodeToMove,
      parentId: newParentId,
      metadata: {
        ...nodeToMove.metadata,
        lastModified: new Date(),
      },
    };

    set({
      organization: {
        ...organization,
        nodes: updatedNodes,
      },
    });
  },

  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
    const { updateNode } = get();
    updateNode(nodeId, { position });
  },

  selectNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  // Utility functions
  getNode: (nodeId: string) => {
    const { organization } = get();
    return organization?.nodes[nodeId] || null;
  },

  getNodeChildren: (nodeId: string) => {
    const { organization } = get();
    if (!organization || !organization.nodes[nodeId]) return [];
    
    const node = organization.nodes[nodeId];
    return node.children.map(childId => organization.nodes[childId]).filter(Boolean);
  },

  getNodePath: (nodeId: string) => {
    const { organization } = get();
    if (!organization || !organization.nodes[nodeId]) return [];

    const path: OrganizationNode[] = [];
    let currentNode: OrganizationNode | null = organization.nodes[nodeId];
    
    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parentId ? organization.nodes[currentNode.parentId] || null : null;
    }
    
    return path;
  },

  getNestingLevel: (nodeId: string) => {
    const { getNodePath } = get();
    const path = getNodePath(nodeId);
    return Math.max(0, path.length - 1); // Subtract 1 because root is level 0
  },

  getAccountCount: () => {
    const { organization } = get();
    if (!organization) return 0;
    
    return Object.values(organization.nodes).filter(node => node.type === 'account').length;
  },

  getOUCount: () => {
    const { organization } = get();
    if (!organization) return 0;
    
    return Object.values(organization.nodes).filter(node => node.type === 'ou').length;
  },
});