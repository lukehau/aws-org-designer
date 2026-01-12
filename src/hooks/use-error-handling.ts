import { useCallback } from 'react';
import { toast } from 'sonner';
import { useStore } from '../store';
import { errorHandlingService, ErrorCategory, ErrorSeverity } from '../services/errorHandlingService';
import type { ValidationError, ValidationResult } from '../types/validation';

/**
 * Comprehensive error handling hook
 * Provides easy access to all error handling functionality
 */
export const useErrorHandling = () => {
  const {
    startLoadingOperation,
    finishLoadingOperation,
    addValidationError,
    clearValidationErrors,
    setShowErrorPanel,
  } = useStore();

  /**
   * Handle JavaScript exceptions with proper categorization
   */
  const handleException = useCallback((
    error: Error,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    context?: Record<string, any>
  ) => {
    const appError = errorHandlingService.handleException(error, category, severity, context);
    
    // Show appropriate user notification
    const toastData = errorHandlingService.createToastFromError(appError);
    if (toastData.type === 'error') {
      toast.error(toastData.title, {
        description: toastData.description,
        action: toastData.action,
      });
    } else if (toastData.type === 'warning') {
      toast.warning(toastData.title, {
        description: toastData.description,
      });
    } else {
      toast.info(toastData.title, {
        description: toastData.description,
      });
    }
    
    return appError;
  }, []);

  /**
   * Handle validation results with user feedback
   */
  const handleValidationResult = useCallback((
    result: ValidationResult,
    showToast: boolean = true,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) => {
    if (!result.isValid) {
      // Add validation errors to store
      result.errors.forEach(error => addValidationError(error));
      
      // Show toast notifications if requested
      if (showToast) {
        if (result.errors.length === 1) {
          const error = result.errors[0];
          toast.error(error.message);
        } else {
          toast.error('Validation Failed', {
            description: `Found ${result.errors.length} validation issues.`,
            action: {
              label: 'View Details',
              onClick: () => setShowErrorPanel(true),
            },
          });
        }
      }
      
      // Handle through error service
      const appErrors = errorHandlingService.handleValidationResult(result, severity);
      return appErrors;
    }
    
    return [];
  }, [addValidationError, setShowErrorPanel]);

  /**
   * Handle individual validation errors
   */
  const handleValidationError = useCallback((
    error: ValidationError,
    showToast: boolean = true,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) => {
    // Add to store
    addValidationError(error);
    
    // Show toast if requested
    if (showToast) {
      toast.error(error.message);
    }
    
    // Handle through error service
    const appError = errorHandlingService.createErrorFromValidation(error, severity);
    errorHandlingService.handleError(appError);
    
    return appError;
  }, [addValidationError]);

  /**
   * Handle async operations with loading states and error handling
   */
  const handleAsyncOperation = useCallback(async <T,>(
    operation: {
      type: 'save' | 'load' | 'validate' | 'create' | 'update' | 'delete';
      message: string;
      successMessage?: string;
      errorMessage?: string;
    },
    asyncFunction: () => Promise<T>,
    options: {
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
    } = {}
  ): Promise<T | null> => {
    const {
      showSuccessToast: showSuccess = true,
      showErrorToast: showError = true,
      category = ErrorCategory.BUSINESS_LOGIC,
      severity = ErrorSeverity.MEDIUM,
    } = options;

    const operationId = startLoadingOperation(operation);
    
    try {
      const result = await asyncFunction();
      finishLoadingOperation(operationId);
      
      if (showSuccess) {
        toast.success(operation.successMessage || 'Operation Successful', {
          description: `${operation.message} completed successfully.`,
        });
      }
      
      return result;
    } catch (error) {
      finishLoadingOperation(operationId);
      
      const appError = handleException(
        error instanceof Error ? error : new Error(String(error)),
        category,
        severity,
        { operation: operation.type, message: operation.message }
      );
      
      if (showError) {
        toast.error(operation.errorMessage || 'Operation Failed', {
          description: appError.userMessage || appError.message,
          action: {
            label: 'Retry',
            onClick: () => {
              // This could trigger a retry mechanism
              console.log('Retry operation:', operation.type);
            },
          },
        });
      }
      
      return null;
    }
  }, [startLoadingOperation, finishLoadingOperation, handleException]);

  /**
   * Handle form submission with validation and error handling
   */
  const handleFormSubmission = useCallback(async <T,>(
    formData: any,
    submitFunction: (data: any) => Promise<T>,
    validationFunction?: (data: any) => ValidationResult,
    options: {
      successMessage?: string;
      errorMessage?: string;
      clearValidationOnSuccess?: boolean;
      showSuccessToast?: boolean;
    } = {}
  ): Promise<T | null> => {
    const {
      successMessage = 'Form submitted successfully',
      errorMessage = 'Form submission failed',
      clearValidationOnSuccess = true,
      showSuccessToast = true,
    } = options;

    // Validate form data if validation function provided
    if (validationFunction) {
      const validationResult = validationFunction(formData);
      if (!validationResult.isValid) {
        handleValidationResult(validationResult);
        return null;
      }
    }

    // Submit form
    const result = await handleAsyncOperation(
      {
        type: 'save',
        message: 'Submitting form',
        successMessage,
        errorMessage,
      },
      () => submitFunction(formData),
      {
        category: ErrorCategory.USER_INPUT,
        severity: ErrorSeverity.MEDIUM,
        showSuccessToast,
      }
    );

    // Clear validation errors on successful submission
    if (result && clearValidationOnSuccess) {
      clearValidationErrors();
    }

    return result;
  }, [handleValidationResult, handleAsyncOperation, clearValidationErrors]);

  /**
   * Show success notification with optional action
   */
  const showSuccess = useCallback((
    title: string,
    description?: string,
    action?: { label: string; onClick: () => void }
  ) => {
    toast.success(title, {
      description,
      action,
    });
  }, []);

  /**
   * Show warning with suggested actions
   */
  const showWarning = useCallback((
    title: string,
    description?: string,
    suggestedActions?: string[]
  ) => {
    toast.warning(title, { description });
    
    if (suggestedActions && suggestedActions.length > 0) {
      toast.info('Suggested Actions', {
        description: suggestedActions.join(', '),
      });
    }
  }, []);

  /**
   * Handle network errors specifically
   */
  const handleNetworkError = useCallback((
    error: Error,
    operation: string = 'network operation'
  ) => {
    return handleException(
      error,
      ErrorCategory.NETWORK,
      ErrorSeverity.HIGH,
      { operation, isNetworkError: true }
    );
  }, [handleException]);

  /**
   * Handle storage errors specifically
   */
  const handleStorageError = useCallback((
    error: Error,
    operation: string = 'storage operation'
  ) => {
    return handleException(
      error,
      ErrorCategory.STORAGE,
      ErrorSeverity.HIGH,
      { operation, isStorageError: true }
    );
  }, [handleException]);

  /**
   * Get error statistics
   */
  const getErrorStats = useCallback(() => {
    return errorHandlingService.getErrorStats();
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    clearValidationErrors();
    errorHandlingService.clearHistory();
  }, [clearValidationErrors]);

  return {
    // Core error handling
    handleException,
    handleValidationResult,
    handleValidationError,
    handleAsyncOperation,
    handleFormSubmission,
    
    // Specific error types
    handleNetworkError,
    handleStorageError,
    
    // User feedback
    showSuccess,
    showWarning,
    
    // Utilities
    getErrorStats,
    clearAllErrors,
    
    // Direct access to error service
    errorService: errorHandlingService,
  };
};