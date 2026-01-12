/**
 * Validation and error handling types
 */

/**
 * Types of validation errors that can occur
 */
export const ValidationErrorType = {
  ACCOUNT_LIMIT_EXCEEDED: 'ACCOUNT_LIMIT_EXCEEDED',
  OU_LIMIT_EXCEEDED: 'OU_LIMIT_EXCEEDED',
  NESTING_LIMIT_EXCEEDED: 'NESTING_LIMIT_EXCEEDED',
  POLICY_LIMIT_EXCEEDED: 'POLICY_LIMIT_EXCEEDED',
  POLICY_SIZE_EXCEEDED: 'POLICY_SIZE_EXCEEDED',
  INVALID_POLICY_JSON: 'INVALID_POLICY_JSON',
  DEFAULT_POLICY_PROTECTION: 'DEFAULT_POLICY_PROTECTION',
  DUPLICATE_POLICY_NAME: 'DUPLICATE_POLICY_NAME'
} as const;

export type ValidationErrorType = typeof ValidationErrorType[keyof typeof ValidationErrorType];

/**
 * Validation error details
 */
export interface ValidationError {
  /** Type of validation error */
  type: ValidationErrorType;
  /** Human-readable error message */
  message: string;
  /** Node ID related to the error (if applicable) */
  nodeId?: string;
  /** Policy ID related to the error (if applicable) */
  policyId?: string;
  /** Current count that caused the violation */
  currentCount?: number;
  /** Maximum allowed value */
  maxAllowed?: number;
}

/**
 * Result of a validation check
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: ValidationError[];
  /** Optional warnings that don't prevent the action */
  warnings?: string[];
}