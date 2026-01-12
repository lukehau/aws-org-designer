/**
 * Comprehensive error handling service
 * Provides centralized error handling, logging, and user feedback
 */

import type { ValidationError, ValidationResult } from '../types/validation';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  STORAGE = 'storage',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
}

/**
 * Application error interface
 */
export interface AppError {
  id: string;
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
  userMessage?: string;
  suggestedActions?: string[];
  recoverable: boolean;
}

/**
 * Error handling configuration
 */
interface ErrorHandlingConfig {
  enableLogging: boolean;
  enableUserNotifications: boolean;
  enableErrorReporting: boolean;
  maxErrorHistory: number;
  autoRetryAttempts: number;
  retryDelay: number;
}

/**
 * Default error handling configuration
 */
const DEFAULT_CONFIG: ErrorHandlingConfig = {
  enableLogging: true,
  enableUserNotifications: true,
  enableErrorReporting: false,
  maxErrorHistory: 100,
  autoRetryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Error handling service class
 */
export class ErrorHandlingService {
  private config: ErrorHandlingConfig;
  private errorHistory: AppError[] = [];
  private errorCallbacks: Map<string, (error: AppError) => void> = new Map();

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create application error from various sources
   */
  createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): AppError {
    return {
      id: this.generateErrorId(),
      code,
      message,
      category,
      severity,
      timestamp: new Date(),
      context,
      recoverable: severity !== ErrorSeverity.CRITICAL,
    };
  }

  /**
   * Create error from JavaScript Error object
   */
  createErrorFromException(
    error: Error,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    context?: Record<string, any>
  ): AppError {
    return {
      id: this.generateErrorId(),
      code: error.name || 'UnknownError',
      message: error.message,
      category,
      severity,
      timestamp: new Date(),
      context,
      stack: error.stack,
      recoverable: severity !== ErrorSeverity.CRITICAL,
    };
  }

  /**
   * Create error from validation error
   */
  createErrorFromValidation(
    validationError: ValidationError,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): AppError {
    const userMessages = {
      ACCOUNT_LIMIT_EXCEEDED: 'You have reached the maximum number of accounts allowed.',
      OU_LIMIT_EXCEEDED: 'You have reached the maximum number of organizational units allowed.',
      NESTING_LIMIT_EXCEEDED: 'The organizational structure is too deeply nested.',
      POLICY_LIMIT_EXCEEDED: 'You have reached the maximum number of policies for this node.',
      POLICY_SIZE_EXCEEDED: 'The policy content is too large.',
      INVALID_POLICY_JSON: 'The policy content is not valid JSON.',
      DEFAULT_POLICY_PROTECTION: 'Default policies cannot be removed from the root node.',
      DUPLICATE_POLICY_NAME: 'A policy with this name already exists.',
    };

    const suggestedActions = this.getValidationErrorActions(validationError);

    return {
      id: this.generateErrorId(),
      code: validationError.type,
      message: validationError.message,
      category: ErrorCategory.VALIDATION,
      severity,
      timestamp: new Date(),
      context: {
        nodeId: validationError.nodeId,
        policyId: validationError.policyId,
        currentCount: validationError.currentCount,
        maxAllowed: validationError.maxAllowed,
      },
      userMessage: userMessages[validationError.type] || validationError.message,
      suggestedActions,
      recoverable: true,
    };
  }

  /**
   * Get suggested actions for validation errors
   */
  private getValidationErrorActions(error: ValidationError): string[] {
    switch (error.type) {
      case 'ACCOUNT_LIMIT_EXCEEDED':
        return [
          'Remove unused accounts',
          'Request limit increase from AWS Support',
          'Consider account consolidation',
        ];
      case 'OU_LIMIT_EXCEEDED':
        return [
          'Remove unused organizational units',
          'Consolidate similar OUs',
          'Request limit increase from AWS Support',
        ];
      case 'NESTING_LIMIT_EXCEEDED':
        return [
          'Flatten the organizational structure',
          'Move nested OUs to higher levels',
          'Redesign the organizational hierarchy',
        ];
      case 'POLICY_LIMIT_EXCEEDED':
        return [
          'Remove unused policies',
          'Consolidate similar policies',
          'Use policy inheritance',
        ];
      case 'POLICY_SIZE_EXCEEDED':
        return [
          'Reduce policy content size',
          'Split into smaller policies',
          'Remove unnecessary statements',
        ];
      case 'INVALID_POLICY_JSON':
        return [
          'Check JSON syntax',
          'Validate policy structure',
          'Use a JSON validator',
        ];
      case 'DEFAULT_POLICY_PROTECTION':
        return [
          'Default policies are required on the root node',
          'Attach required RCP policies',
          'Ensure policy compliance',
        ];
      case 'DUPLICATE_POLICY_NAME':
        return [
          'Choose a different policy name',
          'Rename the existing policy',
          'Use a more descriptive name',
        ];
      default:
        return ['Review error details and take appropriate action'];
    }
  }

  /**
   * Handle error with comprehensive processing
   */
  handleError(error: AppError): void {
    // Add to error history
    this.addToHistory(error);

    // Log error if enabled
    if (this.config.enableLogging) {
      this.logError(error);
    }

    // Trigger callbacks
    this.triggerCallbacks(error);

    // Report error if enabled
    if (this.config.enableErrorReporting) {
      this.reportError(error);
    }
  }

  /**
   * Handle JavaScript exceptions
   */
  handleException(
    error: Error,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    context?: Record<string, any>
  ): AppError {
    const appError = this.createErrorFromException(error, category, severity, context);
    this.handleError(appError);
    return appError;
  }

  /**
   * Handle validation results
   */
  handleValidationResult(
    result: ValidationResult,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): AppError[] {
    const errors: AppError[] = [];
    
    if (!result.isValid) {
      result.errors.forEach(validationError => {
        const appError = this.createErrorFromValidation(validationError, severity);
        this.handleError(appError);
        errors.push(appError);
      });
    }

    return errors;
  }

  /**
   * Add error to history
   */
  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(0, this.config.maxErrorHistory);
    }
  }

  /**
   * Log error to console
   */
  private logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.category.toUpperCase()}] ${error.code}: ${error.message}`;
    
    console[logLevel](logMessage, {
      id: error.id,
      timestamp: error.timestamp,
      context: error.context,
      stack: error.stack,
    });
  }

  /**
   * Get console log level for error severity
   */
  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
    }
  }

  /**
   * Trigger registered callbacks
   */
  private triggerCallbacks(error: AppError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Report error to external service (placeholder)
   */
  private reportError(error: AppError): void {
    // This would integrate with error reporting services like Sentry
    console.info('Error reported:', error.id);
  }

  /**
   * Register error callback
   */
  onError(id: string, callback: (error: AppError) => void): void {
    this.errorCallbacks.set(id, callback);
  }

  /**
   * Unregister error callback
   */
  offError(id: string): void {
    this.errorCallbacks.delete(id);
  }

  /**
   * Get error history
   */
  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.errorHistory.filter(error => error.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorHistory.filter(error => error.severity === severity);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number;
  } {
    const stats = {
      total: this.errorHistory.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: 0,
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count errors
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.errorHistory.forEach(error => {
      stats.byCategory[error.category]++;
      stats.bySeverity[error.severity]++;
      if (error.timestamp > oneHourAgo) {
        stats.recent++;
      }
    });

    return stats;
  }

  /**
   * Create user-friendly toast notification from error
   */
  createToastFromError(error: AppError): {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  } {
    const getToastType = (severity: ErrorSeverity): 'success' | 'error' | 'warning' | 'info' => {
      switch (severity) {
        case ErrorSeverity.CRITICAL:
        case ErrorSeverity.HIGH:
          return 'error';
        case ErrorSeverity.MEDIUM:
          return 'warning';
        case ErrorSeverity.LOW:
          return 'info';
      }
    };

    return {
      type: getToastType(error.severity),
      title: error.userMessage || error.message,
      description: error.suggestedActions?.[0],
      action: error.suggestedActions && error.suggestedActions.length > 1 ? {
        label: 'View Solutions',
        onClick: () => {
          // This would open a detailed error panel or modal
          console.log('Show error solutions:', error.suggestedActions);
        },
      } : undefined,
    };
  }
}

/**
 * Global error handling service instance
 */
export const errorHandlingService = new ErrorHandlingService();

/**
 * Global error handler for unhandled errors
 */
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    errorHandlingService.handleException(error, ErrorCategory.SYSTEM, ErrorSeverity.HIGH, {
      type: 'unhandledrejection',
      promise: event.promise,
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error instanceof Error ? event.error : new Error(event.message);
    errorHandlingService.handleException(error, ErrorCategory.SYSTEM, ErrorSeverity.HIGH, {
      type: 'uncaughterror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
};