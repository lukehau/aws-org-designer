/**
 * Organization Creation Dialog
 * Shows organization creation form when no organization exists
 */

import { useState } from 'react';
import { useStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrganizationCreationForm } from './OrganizationCreationForm';

export function OrganizationCreationDialog() {
  const { organization } = useStore();
  // Derive dialog visibility from organization state - no need for effect
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const showDialog = !organization && !manuallyDismissed;

  return (
    <Dialog open={showDialog} onOpenChange={(open) => !open && setManuallyDismissed(true)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>
        <OrganizationCreationForm 
          onCancel={() => setManuallyDismissed(true)}
        />
      </DialogContent>
    </Dialog>
  );
}