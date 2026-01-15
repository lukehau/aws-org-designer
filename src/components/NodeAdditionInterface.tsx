/**
 * Node Addition Interface Component
 * Provides interface for adding OUs and accounts as children to selected nodes
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldValidation, ValidationMessage, useFormValidation } from '@/components/ui/form-validation';
import { LoadingOverlay } from '@/components/ui/loading-screen';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AWSIcon } from '@/components/icons/aws-icons';
import { useStore } from '@/store';
import { useAutoFocus } from '@/hooks/use-auto-focus';
import type { OrganizationNode } from '@/types/organization';
import type { ValidationResult } from '@/types/validation';

interface NodeAdditionInterfaceProps {
  parentNode: OrganizationNode;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function NodeAdditionInterface({
  parentNode,
  onCancel,
  onSuccess
}: NodeAdditionInterfaceProps) {
  const [nodeType, setNodeType] = useState<'ou' | 'account'>('ou');
  const [isCreating, setIsCreating] = useState(false);
  const nameInputRef = useAutoFocus<HTMLInputElement>();

  const {
    addNode,
    validateNodeCreation,
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
      result.errors.forEach(error => addValidationError(error));
      
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

  // Form validation setup
  const formValidation = useFormValidation(
    { nodeName: '' },
    {
      nodeName: (value: string) => {
        if (value.trim().length > 50) {
          return 'Node name must be less than 50 characters';
        }
        return null;
      },
    }
  );

  // Validate the current configuration
  const validation = validateNodeCreation(parentNode.id, nodeType);
  const canCreate = formValidation.values.nodeName.trim() && validation.isValid && !formValidation.hasErrors;

  // Validation errors are displayed inline - no need for useEffect that causes infinite loops

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formValidation.validateAll()) {
      return;
    }

    // Validate node creation
    if (!validation.isValid) {
      handleValidationResult(validation, true);
      return;
    }

    setIsCreating(true);
    try {
      addNode(parentNode.id, nodeType, formValidation.values.nodeName.trim());
      clearValidationErrors();
      formValidation.reset();
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create ${nodeType === 'ou' ? 'organizational unit' : 'account'}`, {
        description: message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getNodeTypeLabel = (type: 'root' | 'ou' | 'account') => {
    switch (type) {
      case 'root':
        return 'Organization Root';
      case 'ou':
        return 'Organizational Unit';
      case 'account':
        return 'Account';
      default:
        return 'Node';
    }
  };

  // Removed count tracking - no longer needed

  return (
    <LoadingOverlay isLoading={isCreating} message="Creating node...">
      <div className="space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Plus className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Add Node</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Under {getNodeTypeLabel(parentNode.type)} "{parentNode.name}"
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Node Type Selection */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={nodeType === 'ou' ? 'default' : 'outline'}
                  className="h-auto p-3 flex flex-col items-center gap-2"
                  onClick={() => setNodeType('ou')}
                  disabled={isCreating}
                >
                  <AWSIcon type="ou" size="xlg" />
                  <div className="text-xs">
                    <div>Organizational Unit</div>
                  </div>
                </Button>

                <Button
                  type="button"
                  variant={nodeType === 'account' ? 'default' : 'outline'}
                  className="h-auto p-3 flex flex-col items-center gap-2"
                  onClick={() => setNodeType('account')}
                  disabled={isCreating}
                >
                  <AWSIcon type="account" size="xlg" />
                  <div className="text-xs">
                    <div>Account</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Node Name Input */}
            <FieldValidation
              error={formValidation.getFieldError('nodeName') || undefined}
            >
              <Input
                ref={nameInputRef}
                id="node-name"
                type="text"
                placeholder={`Name`}
                value={formValidation.values.nodeName}
                onChange={(e) => formValidation.setValue('nodeName', e.target.value)}
                onBlur={() => formValidation.setTouched('nodeName', true)}
                disabled={isCreating}
                required
              />
            </FieldValidation>

            {/* Validation Errors */}
            {!validation.isValid && (
              <div className="space-y-2">
                {validation.errors.map((error, index) => (
                  <ValidationMessage
                    key={index}
                    type="error"
                    message={error.message}
                  />
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={!canCreate || isCreating}
                className="flex-1"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>


      </div>
    </LoadingOverlay>
  );
}