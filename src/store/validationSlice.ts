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
  
  // Specific limit validation functions
  validateAccountLimits: () => ValidationResult;
  validateOULimits: () => ValidationResult;
  validateNestingLimits: (nodeId: string) => ValidationResult;
  validateSCPLimits: (nodeId: string) => ValidationResult;
  validateRCPLimits: (nodeId: string) => ValidationResult;
  validateDefaultPolicyRequirements: (nodeId: string) => ValidationResult;
  
  // Comprehensive validation
  validateOrganizationStructure: () => ValidationResult;
  validateNodeCompliance: (nodeId: string) => ValidationResult;
  
  // Error management
  addValidationError: (error: ValidationError) => void;
  removeValidationError: (index: number) => void;
  clearValidationErrors: () => void;
  
  // Utility functions
  getValidationErrorsForNode: (nodeId: string) => ValidationError[];
  getValidationErrorsForPolicy: (policyId: string) => ValidationError[];
  hasValidationErrors: () => boolean;
  getValidationSummary: () => { total: number; byType: Record<ValidationErrorType, number> };
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
    } catch (error) {
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

  removeValidationError: (index: number) => {
    const { validationErrors } = get();
    const updatedErrors = validationErrors.filter((_, i) => i !== index);
    set({ validationErrors: updatedErrors });
  },

  clearValidationErrors: () => {
    set({ validationErrors: [] });
  },

  // Specific limit validation functions
  validateAccountLimits: () => {
    const state = get();
    const { organization, getAccountCount } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED,
          'No organization exists.',
        )],
      };
    }

    const errors: ValidationError[] = [];
    const currentAccountCount = getAccountCount();
    const limits = organization.limits;

    if (currentAccountCount > limits.maxAccounts) {
      errors.push(createValidationError(
        ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED,
        `Account limit exceeded. Current: ${currentAccountCount}, Maximum: ${limits.maxAccounts}.`,
        {
          currentCount: currentAccountCount,
          maxAllowed: limits.maxAccounts,
        }
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validateOULimits: () => {
    const state = get();
    const { organization, getOUCount } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.OU_LIMIT_EXCEEDED,
          'No organization exists.',
        )],
      };
    }

    const errors: ValidationError[] = [];
    const currentOUCount = getOUCount();
    const limits = organization.limits;

    if (currentOUCount > limits.maxOUs) {
      errors.push(createValidationError(
        ValidationErrorType.OU_LIMIT_EXCEEDED,
        `Organizational Unit limit exceeded. Current: ${currentOUCount}, Maximum: ${limits.maxOUs}.`,
        {
          currentCount: currentOUCount,
          maxAllowed: limits.maxOUs,
        }
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validateNestingLimits: (nodeId: string) => {
    const state = get();
    const { organization, getNestingLevel } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.NESTING_LIMIT_EXCEEDED,
          'No organization exists.',
          { nodeId }
        )],
      };
    }

    const errors: ValidationError[] = [];
    const currentNestingLevel = getNestingLevel(nodeId);
    const limits = organization.limits;

    if (currentNestingLevel > limits.maxNestingLevels) {
      errors.push(createValidationError(
        ValidationErrorType.NESTING_LIMIT_EXCEEDED,
        `Nesting level limit exceeded for node. Current: ${currentNestingLevel}, Maximum: ${limits.maxNestingLevels}.`,
        {
          nodeId,
          currentCount: currentNestingLevel,
          maxAllowed: limits.maxNestingLevels,
        }
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validateSCPLimits: (nodeId: string) => {
    const state = get();
    const { organization, getNodeAttachedPolicies } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.POLICY_LIMIT_EXCEEDED,
          'No organization exists.',
          { nodeId }
        )],
      };
    }

    const errors: ValidationError[] = [];
    const attachedSCPs = getNodeAttachedPolicies(nodeId, 'scp');
    const limits = organization.limits;

    if (attachedSCPs.length > limits.maxSCPsPerNode) {
      errors.push(createValidationError(
        ValidationErrorType.POLICY_LIMIT_EXCEEDED,
        `SCP limit exceeded for node. Current: ${attachedSCPs.length}, Maximum: ${limits.maxSCPsPerNode}.`,
        {
          nodeId,
          currentCount: attachedSCPs.length,
          maxAllowed: limits.maxSCPsPerNode,
        }
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validateRCPLimits: (nodeId: string) => {
    const state = get();
    const { organization, getNodeAttachedPolicies } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.POLICY_LIMIT_EXCEEDED,
          'No organization exists.',
          { nodeId }
        )],
      };
    }

    const errors: ValidationError[] = [];
    const attachedRCPs = getNodeAttachedPolicies(nodeId, 'rcp');
    const limits = organization.limits;

    if (attachedRCPs.length > limits.maxRCPsPerNode) {
      errors.push(createValidationError(
        ValidationErrorType.POLICY_LIMIT_EXCEEDED,
        `RCP limit exceeded for node. Current: ${attachedRCPs.length}, Maximum: ${limits.maxRCPsPerNode}.`,
        {
          nodeId,
          currentCount: attachedRCPs.length,
          maxAllowed: limits.maxRCPsPerNode,
        }
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validateDefaultPolicyRequirements: (nodeId: string) => {
    const state = get();
    const { organization, getPolicy } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.DEFAULT_POLICY_PROTECTION,
          'No organization exists.',
          { nodeId }
        )],
      };
    }

    const errors: ValidationError[] = [];

    // Only validate for the root node - ensure default policies are present
    if (nodeId === organization.rootId) {
      const defaultSCP = getPolicy('default-scp-full-access');
      const defaultRCP = getPolicy('default-rcp-full-access');

      if (!defaultSCP) {
        errors.push(createValidationError(
          ValidationErrorType.DEFAULT_POLICY_PROTECTION,
          'Default SCP must be present in the organization.',
          { nodeId }
        ));
      }

      if (!defaultRCP) {
        errors.push(createValidationError(
          ValidationErrorType.DEFAULT_POLICY_PROTECTION,
          'Default RCP must be present in the organization.',
          { nodeId }
        ));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Comprehensive validation
  validateOrganizationStructure: () => {
    const state = get();
    const { organization } = state;
    
    if (!organization) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED,
          'No organization exists.',
        )],
      };
    }

    const errors: ValidationError[] = [];
    
    // Validate account limits
    const accountValidation = state.validateAccountLimits();
    errors.push(...accountValidation.errors);

    // Validate OU limits
    const ouValidation = state.validateOULimits();
    errors.push(...ouValidation.errors);

    // Validate each node's compliance
    Object.keys(organization.nodes).forEach(nodeId => {
      const nodeValidation = state.validateNodeCompliance(nodeId);
      errors.push(...nodeValidation.errors);
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validateNodeCompliance: (nodeId: string) => {
    const state = get();
    const { organization } = state;
    
    if (!organization || !organization.nodes[nodeId]) {
      return {
        isValid: false,
        errors: [createValidationError(
          ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED,
          'Node not found.',
          { nodeId }
        )],
      };
    }

    const errors: ValidationError[] = [];

    // Validate nesting limits
    const nestingValidation = state.validateNestingLimits(nodeId);
    errors.push(...nestingValidation.errors);

    // Validate SCP limits
    const scpValidation = state.validateSCPLimits(nodeId);
    errors.push(...scpValidation.errors);

    // Validate RCP limits
    const rcpValidation = state.validateRCPLimits(nodeId);
    errors.push(...rcpValidation.errors);

    // Validate default policy requirements
    const defaultPolicyValidation = state.validateDefaultPolicyRequirements(nodeId);
    errors.push(...defaultPolicyValidation.errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Utility functions
  getValidationErrorsForNode: (nodeId: string) => {
    const { validationErrors } = get();
    return validationErrors.filter(error => error.nodeId === nodeId);
  },

  getValidationErrorsForPolicy: (policyId: string) => {
    const { validationErrors } = get();
    return validationErrors.filter(error => error.policyId === policyId);
  },

  hasValidationErrors: () => {
    const { validationErrors } = get();
    return validationErrors.length > 0;
  },

  getValidationSummary: () => {
    const { validationErrors } = get();
    const summary = {
      total: validationErrors.length,
      byType: {} as Record<ValidationErrorType, number>,
    };

    // Initialize all error types with 0
    Object.values(ValidationErrorType).forEach(type => {
      summary.byType[type] = 0;
    });

    // Count errors by type
    validationErrors.forEach(error => {
      summary.byType[error.type]++;
    });

    return summary;
  },
});