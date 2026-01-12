import { toast } from 'sonner'
import type { ValidationError } from '@/types/validation'

/**
 * Hook that provides Sonner-based toast notifications for errors and warnings
 * Replaces the custom toast system with Sonner
 */
export const useSonnerToast = () => {


  const showErrorToast = (title: string, description?: string, action?: { label: string; onClick: () => void }) => {
    return toast.error(title, {
      description,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    })
  }

  const showWarningToast = (title: string, description?: string) => {
    return toast.warning(title, {
      description,
    })
  }

  const showInfoToast = (title: string, description?: string) => {
    return toast.info(title, {
      description,
    })
  }

  const showValidationErrorToast = (error: ValidationError) => {
    return toast.error(error.message)
  }



  const showOperationError = (operation: string, error: string) => {
    return toast.error('Operation Failed', {
      description: `${operation} failed: ${error}`,
    })
  }



  const showSaveError = (error: string) => {
    return toast.error('Save Failed', {
      description: `Failed to save changes: ${error}`,
      action: {
        label: 'Retry',
        onClick: () => {
          console.log('Retry save operation')
        },
      },
    })
  }

  return {
    showErrorToast,
    showWarningToast,
    showInfoToast,
    showValidationErrorToast,
    showOperationError,
    showSaveError,
  }
}