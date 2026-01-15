/**
 * Node Addition Interface Component
 * Provides interface for adding OUs and accounts as children to selected nodes
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
import { FieldValidation, ValidationMessage, useFormValidation } from '@/components/ui/form-validation';
import { LoadingOverlay } from '@/components/ui/loading-screen';
import { Plus } from 'lucide-react';
import { AWSIcon } from '@/components/icons/aws-icons';
import { useAppStore } from '@/store';
import { useToastNotifications } from '@/hooks/use-toast-notifications';
import { useAutoFocus } from '@/hooks/use-auto-focus';
import type { OrganizationNode } from '@/types/organization';

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
    validateNodeCreation
  } = useAppStore();

  const { handleFormSubmission, handleValidationResult } = useToastNotifications();

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
      handleValidationResult(validation, true); // Show toast for submission validation
      return;
    }

    // Submit form with error handling
    const result = await handleFormSubmission(
      {
        parentId: parentNode.id,
        nodeType,
        nodeName: formValidation.values.nodeName.trim(),
      },
      async (data) => {
        setIsCreating(true);
        try {
          addNode(data.parentId, data.nodeType, data.nodeName);
          return { success: true };
        } finally {
          setIsCreating(false);
        }
      },
      undefined, // No additional validation needed
      {
        errorMessage: `Failed to create ${nodeType === 'ou' ? 'organizational unit' : 'account'}`,
        clearValidationOnSuccess: true,
        showSuccessToast: false, // Visual feedback from the new node appearing is sufficient
      }
    );

    if (result) {
      formValidation.reset();
      onSuccess?.();
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