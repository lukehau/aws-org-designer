/**
 * Organization Creation Dialog
 * Shows organization creation form when no organization exists
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrganizationCreationForm } from './OrganizationCreationForm';

export function OrganizationCreationDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const { organization } = useAppStore();

  // Auto-show organization creation if no organization exists
  useEffect(() => {
    if (!organization) {
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [organization]);

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>
        <OrganizationCreationForm 
          onCancel={() => setShowDialog(false)}
        />
      </DialogContent>
    </Dialog>
  );
}