/**
 * Policy management data models for SCPs and RCPs
 */

/**
 * Policy type enumeration
 */
export type PolicyType = 'scp' | 'rcp';

/**
 * Service Control Policy or Resource Control Policy
 */
export interface Policy {
  /** Unique identifier for the policy */
  id: string;
  /** Display name of the policy */
  name: string;
  /** Type of policy - SCP or RCP */
  type: PolicyType;
  /** JSON policy document content */
  content: string;
  /** Optional description of the policy */
  description?: string;
  /** When the policy was created */
  createdAt: Date;
  /** When the policy was last modified */
  lastModified: Date;
}

/**
 * Policy attachment relationship with inheritance tracking
 */
export interface PolicyAttachment {
  /** ID of the policy being attached */
  policyId: string;
  /** ID of the node the policy is attached to */
  nodeId: string;
  /** When the policy was attached */
  attachedAt: Date;
  /** Parent node ID if this policy is inherited (undefined for direct attachments) */
  inheritedFrom?: string;
}

/**
 * Calculated policy inheritance for a specific node
 */
export interface InheritedPolicies {
  /** Node ID this inheritance calculation is for */
  nodeId: string;
  /** Policies directly attached to this node */
  directPolicies: {
    /** Directly attached SCPs */
    scps: Policy[];
    /** Directly attached RCPs */
    rcps: Policy[];
  };
  /** Policies inherited from parent nodes */
  inheritedPolicies: {
    /** Inherited SCPs with source information */
    scps: Array<{ policy: Policy; inheritedFrom: string }>;
    /** Inherited RCPs with source information */
    rcps: Array<{ policy: Policy; inheritedFrom: string }>;
  };
  /** All effective policies (direct + inherited) */
  effectivePolicies: {
    /** All effective SCPs */
    scps: Policy[];
    /** All effective RCPs */
    rcps: Policy[];
  };
}