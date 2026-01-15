import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Validation message types
 */
export type ValidationMessageType = 'error' | 'warning' | 'success' | 'info';

/**
 * Props for validation message component
 */
interface ValidationMessageProps {
  type: ValidationMessageType;
  message: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Inline validation message component using shadcn Alert
 */
export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  type,
  message,
  className,
  showIcon = true,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
      case 'success':
      case 'info':
      default:
        return 'default' as const;
    }
  };

  return (
    <Alert 
      variant={getVariant()} 
      className={cn(
        className
      )}
    >
      {showIcon && getIcon()}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

/**
 * Props for field validation wrapper
 */
interface FieldValidationProps {
  children: React.ReactNode;
  error?: string;
  warning?: string;
  success?: string;
  info?: string;
  className?: string;
}

/**
 * Field validation wrapper component
 */
export const FieldValidation: React.FC<FieldValidationProps> = ({
  children,
  error,
  warning,
  success,
  info,
  className,
}) => {
  const hasValidation = error || warning || success || info;
  
  return (
    <div className={cn('space-y-2', className)}>
      {children}
      {hasValidation && (
        <div className="space-y-1">
          {error && <ValidationMessage type="error" message={error} />}
          {warning && <ValidationMessage type="warning" message={warning} />}
          {success && <ValidationMessage type="success" message={success} />}
          {info && <ValidationMessage type="info" message={info} />}
        </div>
      )}
    </div>
  );
};

/**
 * Props for validation status indicator
 */
interface ValidationStatusProps {
  isValid: boolean;
  isValidating?: boolean;
  validMessage?: string;
  invalidMessage?: string;
  className?: string;
}

/**
 * Validation status indicator component
 */
export const ValidationStatus: React.FC<ValidationStatusProps> = ({
  isValid,
  isValidating = false,
  validMessage = 'Valid',
  invalidMessage = 'Invalid',
  className,
}) => {
  if (isValidating) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400', className)}>
        <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
        <span>Validating...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm',
        isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
        className
      )}
    >
      {isValid ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      <span>{isValid ? validMessage : invalidMessage}</span>
    </div>
  );
};

/**
 * Hook for managing form validation state
 */
export const useFormValidation = <T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: Record<keyof T, (value: T[keyof T]) => string | null>
) => {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Record<keyof T, string | null>>({} as Record<keyof T, string | null>);
  const [touched, setTouchedState] = React.useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const validateField = React.useCallback((field: keyof T, value: T[keyof T]) => {
    const rule = validationRules[field];
    if (rule) {
      return rule(value);
    }
    return null;
  }, [validationRules]);

  const validateAll = React.useCallback(() => {
    const newErrors: Record<keyof T, string | null> = {} as Record<keyof T, string | null>;
    let isValid = true;

    Object.keys(values).forEach((key) => {
      const field = key as keyof T;
      const error = validateField(field, values[field]);
      newErrors[field] = error;
      if (error) {
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  const setValue = React.useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Validate field if it has been touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  }, [touched, validateField]);

  const setTouched = React.useCallback((field: keyof T, isTouched: boolean = true) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }));
    
    // Validate field when it becomes touched
    if (isTouched) {
      const error = validateField(field, values[field]);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  }, [values, validateField]);

  const reset = React.useCallback(() => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, string | null>);
    setTouchedState({} as Record<keyof T, boolean>);
  }, [initialValues]);

  const hasErrors = React.useMemo(() => {
    return Object.values(errors).some(error => error !== null);
  }, [errors]);

  const getFieldError = React.useCallback((field: keyof T) => {
    return touched[field] ? errors[field] : null;
  }, [errors, touched]);

  return {
    values,
    errors,
    touched,
    hasErrors,
    setValue,
    setTouched,
    validateField,
    validateAll,
    getFieldError,
    reset,
  };
};