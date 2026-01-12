/**
 * Node Edit Interface Component
 * Provides interface for editing node properties
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X } from 'lucide-react';
import { useAppStore } from '@/store';
import type { OrganizationNode } from '@/types/organization';

interface NodeEditInterfaceProps {
  node: OrganizationNode;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function NodeEditInterface({ 
  node, 
  onCancel, 
  onSuccess 
}: NodeEditInterfaceProps) {
  const [nodeName, setNodeName] = useState(node.name);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { updateNode } = useAppStore();

  const canSave = nodeName.trim() && nodeName.trim() !== node.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSave) return;

    setIsUpdating(true);
    try {
      updateNode(node.id, { name: nodeName.trim() });
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update node:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setNodeName(node.name);
    onCancel?.();
  };

  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case 'root':
        return 'Root Organization';
      case 'ou':
        return 'Organizational Unit';
      case 'account':
        return 'Account';
      default:
        return 'Node';
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="space-y-4">
        <div className="text-center">
          <Edit className="h-10 w-10 mx-auto text-primary mb-2" />
          <h3 className="text-lg font-semibold">Edit Node</h3>
          <p className="text-sm text-muted-foreground">
            Modify properties for this {getNodeTypeLabel(node.type).toLowerCase()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Node Type (Read-only) */}
          <div className="space-y-2">
            <Label>Node Type</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm">
              {getNodeTypeLabel(node.type)}
            </div>
          </div>

          {/* Node Name Input */}
          <div className="space-y-2">
            <Label htmlFor="edit-node-name">
              {node.type === 'root' ? 'Organization Name' : 'Node Name'}
            </Label>
            <Input
              id="edit-node-name"
              type="text"
              placeholder="Enter node name"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              disabled={isUpdating}
              required
            />
          </div>

          {/* Node Metadata (Read-only) */}
          <div className="space-y-2">
            <Label>Node Information</Label>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded space-y-1">
              <div><strong>ID:</strong> {node.id}</div>
              <div><strong>Created:</strong> {node.metadata.createdAt.toLocaleString()}</div>
              <div><strong>Last Modified:</strong> {node.metadata.lastModified.toLocaleString()}</div>
              {node.children.length > 0 && (
                <div><strong>Children:</strong> {node.children.length} nodes</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={!canSave || isUpdating}
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}