/**
 * Organization Creation Form Component
 * Provides interface to create a new AWS Organization starting with root node
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { AWSIcon } from '@/components/icons/aws-icons';
import { useAppStore } from '@/store';
import { useAutoFocus } from '@/hooks/use-auto-focus';

interface OrganizationCreationFormProps {
  onCancel?: () => void;
}

export function OrganizationCreationForm({ onCancel }: OrganizationCreationFormProps) {
  const [organizationName, setOrganizationName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createOrganization } = useAppStore();
  const nameInputRef = useAutoFocus<HTMLInputElement>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationName.trim()) return;

    setIsCreating(true);
    try {
      createOrganization(organizationName.trim());
      setOrganizationName('');
      // Close dialog properly instead of reloading
      onCancel?.();
    } catch (error) {
      console.error('Failed to create organization:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center space-y-2">
        <AWSIcon type="root" size="xlg" />
        <p className="text-sm text-muted-foreground">
          Start by creating your AWS Organization
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            ref={nameInputRef}
            id="org-name"
            type="text"
            placeholder="Name"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            disabled={isCreating}
            required
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={!organizationName.trim() || isCreating}
            className="flex-1"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isCreating ? 'Creating...' : 'Create Organization'}
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
  );
}