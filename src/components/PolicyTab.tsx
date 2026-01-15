/**
 * Policy Tab Component
 * Main interface for managing policies with Create/View/Edit functionality
 */

import { useState, useEffect, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ValidationMessage } from '@/components/ui/form-validation';
import { Edit, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/store';
import type { OrganizationNode } from '@/types/organization';
import type { Policy, PolicyType } from '@/types/policy';
import { PolicyFileTree } from './PolicyFileTree';
import { getPolicyConfig, getPolicyDisplayName } from '@/config/policyConfig';

// Lazy load the JsonEditor component (CodeMirror is ~333KB)
const JsonEditor = lazy(() => import('@/components/ui/json-editor').then(m => ({ default: m.JsonEditor })));

// Loading fallback for the editor
function EditorLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[250px] rounded-md border border-input bg-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading editor...</span>
      </div>
    </div>
  );
}

interface PolicyTabProps {
  selectedNode?: OrganizationNode | null;
}

export function PolicyTab({ selectedNode }: PolicyTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleCreatePolicy = () => {
    setShowCreateDialog(true);
  };

  const handleViewPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setShowViewDialog(true);
  };

  const handleDeletePolicy = (policy: Policy) => {
    setPolicyToDelete({ id: policy.id, name: policy.name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (policyToDelete) {
      const { deletePolicy } = useStore.getState();
      deletePolicy(policyToDelete.id);

      // Show success toast
      toast.success('Policy Deleted', {
        description: `"${policyToDelete.name}" has been deleted successfully.`
      });

      // Close both dialogs
      setDeleteDialogOpen(false);
      setShowViewDialog(false);
      setPolicyToDelete(null);
      setSelectedPolicy(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPolicyToDelete(null);
  };

  return (
    <>
      {/* Create Policy Button */}
      <div className="mb-4">
        <Button onClick={handleCreatePolicy} size="sm">
          <Plus className="h-4 w-4" />
          <span className="ml-1">Create</span>
        </Button>
      </div>

      {/* Policy File Tree */}
      <PolicyFileTree
        selectedNode={selectedNode}
        onViewPolicy={handleViewPolicy}
      />

      {/* Create Policy Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="!max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Policy</DialogTitle>
          </DialogHeader>
          <PolicyCreateForm
            onSuccess={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Policy Viewer Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="!max-w-4xl">
          <DialogHeader>
            <DialogTitle>View Policy</DialogTitle>
          </DialogHeader>
          {selectedPolicy && (
            <PolicyViewer
              policy={selectedPolicy}
              onDeletePolicy={handleDeletePolicy}
              onClose={() => setShowViewDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{policyToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Policy configuration is now imported from shared config

// Sub-components

interface PolicyCreateFormProps {
  onSuccess: () => void;
}

function PolicyCreateForm({ onSuccess }: PolicyCreateFormProps) {
  const [policyType, setPolicyType] = useState<PolicyType>('scp');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const { createPolicy, validatePolicyName } = useStore();
  const config = getPolicyConfig(policyType);

  // Update content when policy type changes
  useEffect(() => {
    setContent(getPolicyConfig(policyType).defaultContent);
  }, [policyType]);

  // Validate name in real-time
  useEffect(() => {
    if (!name.trim()) {
      setNameError(null);
      return;
    }

    const validation = validatePolicyName(name, policyType);
    if (!validation.isValid && validation.errors.length > 0) {
      setNameError(validation.errors[0].message);
    } else {
      setNameError(null);
    }
  }, [name, policyType, validatePolicyName]);

  // Validate JSON in real-time
  useEffect(() => {
    if (!content.trim()) {
      setJsonError(null);
      return;
    }

    try {
      JSON.parse(content);
      setJsonError(null);
    } catch {
      setJsonError('Policy document must be valid JSON');
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !content.trim() || jsonError || nameError) return;

    setIsCreating(true);
    try {
      // Validate JSON
      JSON.parse(content);

      createPolicy({
        name: name.trim(),
        type: policyType,
        content: content.trim(),
        description: description.trim() || undefined,
      });

      onSuccess();
    } catch {
      console.error(`Failed to create ${config.abbreviation}`);
      // TODO: Add proper error handling
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <Label>Policy Type</Label>
        <RadioGroup value={policyType} onValueChange={(value: string) => setPolicyType(value as PolicyType)}>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="scp" id="scp" />
            <Label htmlFor="scp">{getPolicyDisplayName('scp')}</Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="rcp" id="rcp" />
            <Label htmlFor="rcp">{getPolicyDisplayName('rcp')}</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="policy-name">Policy Name</Label>
        <Input
          id="policy-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter policy name"
          className="text-sm"
          required
        />
        {nameError && (
          <ValidationMessage
            type="error"
            message={nameError}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="policy-description">Description (Optional)</Label>
        <Input
          id="policy-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the policy"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="policy-content">Policy Document (JSON)</Label>
        <Suspense fallback={<EditorLoadingFallback />}>
          <JsonEditor
            id="policy-content"
            value={content}
            onChange={setContent}
            placeholder="Enter JSON policy document"
            required
          />
        </Suspense>
      </div>

      {/* JSON Validation Error */}
      {jsonError && (
        <div className="space-y-2">
          <ValidationMessage
            type="error"
            message={jsonError}
          />
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isCreating || !name.trim() || !content.trim() || !!jsonError || !!nameError}>
          {isCreating ? 'Creating...' : `Create ${config.name}`}
        </Button>
      </div>
    </form>
  );
}

interface PolicyViewerProps {
  policy: Policy;
  onDeletePolicy: (policy: Policy) => void;
  onClose: () => void;
}

export function PolicyViewer({ policy, onDeletePolicy, onClose }: PolicyViewerProps) {
  const [formattedContent, setFormattedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState(policy.name);
  const [editDescription, setEditDescription] = useState(policy.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const config = getPolicyConfig(policy.type);
  const { updatePolicy, validatePolicyName } = useStore();

  // Check if this is a default policy
  const isDefaultPolicy = policy.id === 'default-scp-full-access' || policy.id === 'default-rcp-full-access';

  // Format JSON content for display
  useEffect(() => {
    try {
      const parsed = JSON.parse(policy.content);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormattedContent(formatted);
      setEditContent(formatted);
    } catch {
      setFormattedContent(policy.content);
      setEditContent(policy.content);
    }
    setEditName(policy.name);
    setEditDescription(policy.description || '');
  }, [policy.content, policy.name, policy.description]);

  // Validate name in real-time when editing
  useEffect(() => {
    if (!isEditing) {
      setNameError(null);
      return;
    }

    if (!editName.trim()) {
      setNameError(null);
      return;
    }

    const validation = validatePolicyName(editName, policy.type, policy.id);
    if (!validation.isValid && validation.errors.length > 0) {
      setNameError(validation.errors[0].message);
    } else {
      setNameError(null);
    }
  }, [editName, policy.type, policy.id, isEditing, validatePolicyName]);

  // Validate JSON in real-time when editing
  useEffect(() => {
    if (!isEditing) {
      setJsonError(null);
      return;
    }

    if (!editContent.trim()) {
      setJsonError(null);
      return;
    }

    try {
      JSON.parse(editContent);
      setJsonError(null);
    } catch {
      setJsonError('Policy document must be valid JSON');
    }
  }, [editContent, isEditing]);

  const handleEdit = () => {
    if (!isDefaultPolicy) {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!editName.trim() || !editContent.trim() || jsonError || nameError) return;

    setIsSaving(true);
    try {
      // Validate JSON
      JSON.parse(editContent);

      // Update the policy
      updatePolicy(policy.id, {
        name: editName.trim(),
        content: editContent.trim(),
        description: editDescription.trim() || undefined,
      });

      // Show success toast
      toast.success('Policy Saved', {
        description: `"${editName.trim()}" has been updated successfully.`
      });

      // Close the dialog
      onClose();
    } catch {
      console.error('Invalid JSON or save failed');
      toast.error('Save Failed', {
        description: 'Invalid JSON format or save operation failed.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(formattedContent);
    setEditName(policy.name);
    setEditDescription(policy.description || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Policy Metadata */}
      {isEditing && !isDefaultPolicy ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="edit-policy-name">Policy Name</Label>
            <Input
              id="edit-policy-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter policy name"
              className="text-sm"
              required
            />
            {nameError && (
              <ValidationMessage
                type="error"
                message={nameError}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-policy-description">Description (Optional)</Label>
            <Input
              id="edit-policy-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Brief description of the policy"
            />
          </div>

          <Separator />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Policy Name</Label>
              <div className="flex items-center gap-2">
                <p className="font-medium">{policy.name}</p>
                {isDefaultPolicy && (
                  <Badge variant="secondary">
                    Default
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Policy Type</Label>
              <p className="font-medium">{config.name}</p>
            </div>
          </div>

          {policy.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm">{policy.description}</p>
            </div>
          )}

          <Separator />
        </>
      )}

      {/* Policy Content */}
      <div>
        <Label className="text-xs text-muted-foreground">Policy Document</Label>
        <Suspense fallback={<EditorLoadingFallback />}>
          <JsonEditor
            value={isEditing && !isDefaultPolicy ? editContent : formattedContent}
            onChange={setEditContent}
            readOnly={!isEditing || isDefaultPolicy}
            placeholder="Enter JSON policy document"
            className="mt-2"
          />
        </Suspense>
      </div>

      {/* Validation Errors */}
      {isEditing && jsonError && (
        <div className="space-y-2">
          <ValidationMessage
            type="error"
            message={jsonError}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        {isEditing ? (
          <>
            <Button
              onClick={handleSave}
              disabled={isSaving || !editName.trim() || !editContent.trim() || !!jsonError || !!nameError}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            {!isDefaultPolicy && (
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {!isDefaultPolicy && (
              <Button
                variant="destructive"
                onClick={() => onDeletePolicy(policy)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            {isDefaultPolicy && (
              <div className="text-sm text-muted-foreground">
                Default policies cannot be edited or deleted
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}