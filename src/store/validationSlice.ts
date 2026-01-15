/**
 * Validation slice with AWS limits enforcement
 * Implements comprehensive validation for AWS Organizations limits and constraints
 */

import type { StateCreator } from 'zustand';
import type { ValidationError, ValidationResult } from '../types/validation';
import { ValidationErrorType } from '../types/validation';
import type { AppState } from './index';

/**
 * Validation state and actions
 */
export interface ValidationSlice {
  // State
  validationErrors: ValidationError[];
  
  // Core validation actions
  validateNodeCreation: (parentId: string, type: 'ou' | 'account') => ValidationResult;
  validatePolicyAttachment: (nodeId: string, policyId: string) => ValidationResult;
  validatePolicyDetachment: (nodeId: string, policyId: string) => ValidationResult;
  validatePolicyContent: (content: string) => ValidationResult;
  validatePolicyName: (name: string, type: 'scp' | 'rcp', excludePolicyId?: string) => ValidationResult;
  
  // Error management
  addValidationError: (error: ValidationError) => void;
  clearValidationErrors: () => void;
  hasValidationErrors: () => boolean;
}

/**
 * Create validation error
 */
const createValidationError = (
  type: ValidationErrorType,
  message: string,
  options: {
    nodeId?: string;
    policyId?: string;
    currentCount?: number;
    maxAllowed?: number;
  } = {}
): ValidationError => ({
  type,
  message,
  ...options,
});

/**
 * Create validation slice
 */
export const createValidationSlice: StateCreator<
  AppState,
  [],
  [],
  ValidationSlice
> = (set, get) => ({
  // Initial state
  validationErrors: [],

  // Validation actions
  validateNodeCreation: (parentId: string, type: 'ou' | 'account') => {
    const state = get();
    const { organization, getNestingLevel } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED,
          'No organization exists. Create an organization first.',
          { nodeId: parentId }
        )],
      };
    }

    const errors: ValidationError[] = [];
    const limits = organization.limits;

    // Account and OU limits removed - no longer tracking counts

    // Check nesting level limit - only applies to OUs, not accounts
    // Accounts are leaf nodes and don't contribute to nesting depth
    if (type === 'ou') {
      const parentNestingLevel = getNestingLevel(parentId);
      if (parentNestingLevel >= limits.maxNestingLevels) {
        errors.push(createValidationError(
          ValidationErrorType.NESTING_LIMIT_EXCEEDED,
          `Cannot create organizational unit. Maximum nesting level reached (${limits.maxNestingLevels} levels under root).`,
          {
            nodeId: parentId,
            currentCount: parentNestingLevel,
            maxAllowed: limits.maxNestingLevels,
          }
        ));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validatePolicyAttachment: (nodeId: string, policyId: string) => {
    const state = get();
    const { organization, getPolicy, getNodeAttachedPolicies, isPolicyAttachedToNode } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED,
          'No organization exists.',
          { nodeId, policyId }
        )],
      };
    }

    const policy = getPolicy(policyId);
    if (!policy) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.INVALID_POLICY_JSON,
          'Policy not found.',
          { nodeId, policyId }
        )],
      };
    }

    const errors: ValidationError[] = [];
    const limits = organization.limits;

    // Check if already attached
    if (isPolicyAttachedToNode(nodeId, policyId)) {
      errors.push(createValidationError(
        ValidationErrorType.POLICY_LIMIT_EXCEEDED,
        'Policy is already attached to this node.',
        { nodeId, policyId }
      ));
    }

    // Check policy limits based on type
    const attachedPolicies = getNodeAttachedPolicies(nodeId, policy.type);
    const maxPolicies = policy.type === 'scp' ? limits.maxSCPsPerNode : limits.maxRCPsPerNode;
    
    if (attachedPolicies.length >= maxPolicies) {
      errors.push(createValidationError(
        ValidationErrorType.POLICY_LIMIT_EXCEEDED,
        `Cannot attach ${policy.type.toUpperCase()}. Maximum ${policy.type.toUpperCase()}s per node limit reached (${maxPolicies}).`,
        {
          nodeId,
          policyId,
          currentCount: attachedPolicies.length,
          maxAllowed: maxPolicies,
        }
      ));
    }

    // Validate policy content size
    if (policy.content.length > limits.maxPolicySize) {
      errors.push(createValidationError(
        ValidationErrorType.POLICY_SIZE_EXCEEDED,
        `Policy content exceeds maximum size limit (${limits.maxPolicySize} characters).`,
        {
          nodeId,
          policyId,
          currentCount: policy.content.length,
          maxAllowed: limits.maxPolicySize,
        }
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validatePolicyDetachment: (nodeId: string, policyId: string) => {
    const state = get();
    const { organization, getPolicy, isPolicyAttachedToNode } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED,
          'No organization exists.',
          { nodeId, policyId }
        )],
      };
    }

    const policy = getPolicy(policyId);
    if (!policy) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.INVALID_POLICY_JSON,
          'Policy not found.',
          { nodeId, policyId }
        )],
      };
    }

    const errors: ValidationError[] = [];

    // Check if policy is actually attached
    if (!isPolicyAttachedToNode(nodeId, policyId)) {
      errors.push(createValidationError(
        ValidationErrorType.DEFAULT_POLICY_PROTECTION,
        'Policy is not attached to this node.',
        { nodeId, policyId }
      ));
    }

    // Check default policy protection - prevent detaching default policies from root node
    if (nodeId === organization.rootId) {
      const isDefaultPolicy = policyId === 'default-scp-full-access' || policyId === 'default-rcp-full-access';
      
      if (isDefaultPolicy) {
        errors.push(createValidationError(
          ValidationErrorType.DEFAULT_POLICY_PROTECTION,
          'Default policies cannot be removed from the root node',
          { nodeId, policyId }
        ));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validatePolicyContent: (content: string) => {
    const errors: ValidationError[] = [];

    // Check if content is valid JSON
    try {
      JSON.parse(content);
    } catch {
      errors.push(createValidationError(
        ValidationErrorType.INVALID_POLICY_JSON,
        'Policy content must be valid JSON.',
      ));
    }

    // Check content size
    const { organization } = get();
    if (organization && content.length > organization.limits.maxPolicySize) {
      errors.push(createValidationError(
        ValidationErrorType.POLICY_SIZE_EXCEEDED,
        `Policy content exceeds maximum size limit (${organization.limits.maxPolicySize} characters).`,
        {
          currentCount: content.length,
          maxAllowed: organization.limits.maxPolicySize,
        }
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validatePolicyName: (name: string, type: 'scp' | 'rcp', excludePolicyId?: string) => {
    const state = get();
    const { isPolicyNameTaken } = state;
    const errors: ValidationError[] = [];

    // Check if name is empty
    if (!name.trim()) {
      errors.push(createValidationError(
        ValidationErrorType.DUPLICATE_POLICY_NAME,
        'Policy name cannot be empty.',
      ));
      return {
        isValid: false,
        errors,
      };
    }

    // Check for duplicate names (case-insensitive, per policy type)
    if (isPolicyNameTaken(name, type, excludePolicyId)) {
      const policyTypeName = type === 'scp' ? 'Service Control Policy' : 'Resource Control Policy';
      errors.push(createValidationError(
        ValidationErrorType.DUPLICATE_POLICY_NAME,
        `A ${policyTypeName} with this name already exists. Please choose a different name.`,
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Error management
  addValidationError: (error: ValidationError) => {
    const { validationErrors } = get();
    set({ validationErrors: [...validationErrors, error] });
  },

  clearValidationErrors: () => {
    set({ validationErrors: [] });
  },

  hasValidationErrors: () => {
    const { validationErrors } = get();
    return validationErrors.length > 0;
  },
});