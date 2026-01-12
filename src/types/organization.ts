/**
 * Core data models for AWS Organization structure and policy management
 */

/**
 * Organization limits based on AWS constraints
 */
export interface OrganizationLimits {
  /** Maximum number of accounts (default 10, adjustable to 10,000) */
  maxAccounts: number;
  /** Maximum number of organizational units (2,000) */
  maxOUs: number;
  /** Maximum nesting levels under root (5 levels) */
  maxNestingLevels: number;
  /** Maximum SCPs per node (5 SCPs per node) */
  maxSCPsPerNode: number;
  /** Maximum RCPs per node (5 RCPs per node) */
  maxRCPsPerNode: number;
  /** Maximum policy size in characters (5,120 characters for SCPs/RCPs) */
  maxPolicySize: number;
}

/**
 * Individual node in the AWS Organization structure
 * Supports root, organizational units (OUs), and accounts
 */
export interface OrganizationNode {
  /** Unique identifier for the node */
  id: string;
  /** Display name of the node */
  name: string;
  /** Type of node - root, organizational unit, or account */
  type: 'root' | 'ou' | 'account';
  /** Parent node ID (null for root) */
  parentId: string | null;
  /** Array of child node IDs */
  children: string[];
  /** Position for visualization (x, y coordinates) */
  position: { x: number; y: number };
  /** Node metadata */
  metadata: {
    /** When the node was created */
    createdAt: Date;
    /** When the node was last modified */
    lastModified: Date;
  };
}

/**
 * Complete AWS Organization structure
 */
export interface Organization {
  /** Unique identifier for the organization */
  id: string;
  /** Organization name */
  name: string;
  /** ID of the root node */
  rootId: string;
  /** Collection of all nodes indexed by ID */
  nodes: Record<string, OrganizationNode>;
  /** AWS limits and constraints for this organization */
  limits: OrganizationLimits;
}