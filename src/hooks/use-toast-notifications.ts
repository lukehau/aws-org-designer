import { useCallback } from 'react';
import { toast } from 'sonner';
import { useStore } from '../store';
import type { ValidationError, ValidationResult } from '../types/validation';

/**
 * Toast notifications hook
 * Provides toast notifications and validation error handling
 */
export const useToastNotifications = () => {
  const {
    addValidationError,
    clearValidationErrors,
    setShowErrorPanel,
  } = useStore();

  /**
   * Handle validation results with user feedback
   */
  const handleValidationResult = useCallback((
    result: ValidationResult,
    showToast: boolean = true
  ) => {
    if (!result.isValid) {
      // Add validation errors to store
      result.errors.forEach(error => addValidationError(error));
      
      // Show toast notifications if requested
      if (showToast) {
        if (result.errors.length === 1) {
          toast.error(result.errors[0].message);
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
    }
  }, [addValidationError, setShowErrorPanel]);

  /**
   * Handle form submission with error handling
   */
  const handleFormSubmission = useCallback(async <T, D = unknown>(
    formData: D,
    submitFunction: (data: D) => Promise<T>,
    validationFunction?: (data: D) => ValidationResult,
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

    try {
      const result = await submitFunction(formData);
      
      if (showSuccessToast) {
        toast.success(successMessage);
      }
      
      if (clearValidationOnSuccess) {
        clearValidationErrors();
      }
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage, {
        description: message,
      });
      return null;
    }
  }, [handleValidationResult, clearValidationErrors]);

  /**
   * Show success toast
   */
  const showSuccess = useCallback((
    title: string,
    description?: string
  ) => {
    toast.success(title, { description });
  }, []);

  /**
   * Show error toast
   */
  const showErrorToast = useCallback((
    title: string,
    description?: string,
    action?: { label: string; onClick: () => void }
  ) => {
    return toast.error(title, {
      description,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    });
  }, []);

  /**
   * Show validation error toast
   */
  const showValidationErrorToast = useCallback((error: ValidationError) => {
    return toast.error(error.message);
  }, []);

  /**
   * Clear all validation errors
   */
  const clearAllErrors = useCallback(() => {
    clearValidationErrors();
  }, [clearValidationErrors]);

  return {
    handleValidationResult,
    handleFormSubmission,
    showSuccess,
    showErrorToast,
    showValidationErrorToast,
    clearAllErrors,
  };
};
