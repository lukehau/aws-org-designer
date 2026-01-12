/**
 * Shared policy configuration for consistent policy type handling across components
 */

import type { PolicyType } from '@/types/policy';

export interface PolicyConfig {
  name: string;
  plural: string;
  abbreviation: string;
  defaultContent: string;
}

export const POLICY_CONFIG: Record<PolicyType, PolicyConfig> = {
  scp: {
    name: 'Service Control Policy',
    plural: 'Service Control Policies',
    abbreviation: 'SCP',
    defaultContent: '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Deny",\n      "Action": "*",\n      "Resource": "*"\n    }\n  ]\n}',
  },
  rcp: {
    name: 'Resource Control Policy',
    plural: 'Resource Control Policies',
    abbreviation: 'RCP',
    defaultContent: '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Principal": "*",\n      "Action": "*",\n      "Resource": "*"\n    }\n  ]\n}',
  },
} as const;

/**
 * Helper function to get policy configuration by type
 */
export function getPolicyConfig(policyType: PolicyType): PolicyConfig {
  return POLICY_CONFIG[policyType];
}

/**
 * Helper function to get policy display name
 */
export function getPolicyDisplayName(policyType: PolicyType): string {
  return POLICY_CONFIG[policyType].name;
}

/**
 * Helper function to get policy plural name
 */
export function getPolicyPluralName(policyType: PolicyType): string {
  return POLICY_CONFIG[policyType].plural;
}

/**
 * Helper function to get policy abbreviation
 */
export function getPolicyAbbreviation(policyType: PolicyType): string {
  return POLICY_CONFIG[policyType].abbreviation;
}