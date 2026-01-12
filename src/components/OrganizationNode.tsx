/**
 * Organization Node Component for React Flow
 * Represents individual nodes (root, OU, account) in the organization tree
 * Optimized for performance with React.memo and useMemo
 */

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PolicyBadge } from "@/components/ui/policy-badge";

import { AWSIcon, getIconTypeFromNodeType } from "@/components/icons/aws-icons";
import {
  Plus,
  X
} from "lucide-react";
import { useAppStore } from "@/store";
import type { OrganizationNode as OrgNodeType, Organization } from "@/types/organization";

interface NodeData {
  node: OrgNodeType;
  organization: Organization;
  onAddNode?: (node: OrgNodeType) => void;
  onDeleteNode?: (node: OrgNodeType) => void;
  onPolicyClick?: (policyId: string) => void;
}



/**
 * Organization Node Component
 * Optimized with React.memo and memoized calculations
 */
export const OrganizationNode = memo(({ data, selected }: NodeProps) => {
  const { node, onPolicyClick } = data as unknown as NodeData;

  const {
    selectedNodeId,
    selectNode,
    getNodeChildren,
    renameNode,
    inheritanceTrailNodeId,
    setInheritanceTrailNodeId,
    getNodePath,
    showAllPolicyBadges,
    allNodesPolicyData,
    inheritanceTrailCache,
    refreshInheritanceTrailCache
  } = useAppStore();

  // Local state for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Memoized calculations for performance
  const children = useMemo(() => getNodeChildren(node.id), [getNodeChildren, node.id]);
  const hasChildren = useMemo(() => children.length > 0, [children.length]);
  const isSelected = useMemo(() => selectedNodeId === node.id || selected, [selectedNodeId, node.id, selected]);

  // Use reactive store cache for policy data
  const visiblePolicyData = useMemo(() => {
    if (inheritanceTrailNodeId) {
      // Check if inheritance trail cache exists for this node
      let inheritanceTrailData = inheritanceTrailCache.get(inheritanceTrailNodeId);
      
      // If not cached, refresh the cache for this node
      if (!inheritanceTrailData) {
        refreshInheritanceTrailCache(inheritanceTrailNodeId);
        inheritanceTrailData = inheritanceTrailCache.get(inheritanceTrailNodeId) || [];
      }
      
      return inheritanceTrailData;
    }
    
    if (showAllPolicyBadges) {
      // Use reactive store cache
      return allNodesPolicyData;
    }
    
    // Show nothing (default state)
    return [];
  }, [inheritanceTrailNodeId, showAllPolicyBadges, allNodesPolicyData, inheritanceTrailCache, refreshInheritanceTrailCache]);

  // Get this node's policy info
  const nodePolicyInfo = useMemo(() => {
    return visiblePolicyData.find(item => item.nodeId === node.id) || null;
  }, [visiblePolicyData, node.id]);

  const shouldShowInheritanceTrail = useMemo(() => {
    return inheritanceTrailNodeId !== null;
  }, [inheritanceTrailNodeId]);

  const isInInheritancePath = useMemo(() => {
    if (!shouldShowInheritanceTrail) return true; // Normal opacity when no trail
    if (isSelected) return true; // Selected node is always in path
    
    // Check if this node is in the inheritance path from root to selected node
    if (!inheritanceTrailNodeId) return true;
    
    const selectedNodePath = getNodePath(inheritanceTrailNodeId);
    const isInPath = selectedNodePath.some(pathNode => pathNode.id === node.id);
    
    return isInPath;
  }, [shouldShowInheritanceTrail, isSelected, inheritanceTrailNodeId, node.id, getNodePath]);



  // Memoized icon
  const nodeIcon = useMemo(() => {
    const iconType = getIconTypeFromNodeType(node.type);
    return <AWSIcon type={iconType} size="lg" />;
  }, [node.type]);

  // Memoized styling based on node type
  const nodeStyles = useMemo(() => {
    switch (node.type) {
      case 'root':
        return 'bg-primary text-primary-foreground';
      case 'ou':
        return 'bg-gray-200';
      case 'account':
        return 'bg-white border-gray-200 border-2';
      default:
        return 'bg-white border-gray-200 border-2';
    }
  }, [node.type]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Memoized event handlers
  const handleSelect = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    selectNode(node.id);
    // Set inheritance trail for this node
    setInheritanceTrailNodeId(node.id);
  }, [selectNode, node.id, setInheritanceTrailNodeId]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingName(node.name);
  }, [node.name]);

  const handleSaveEdit = useCallback(() => {
    const trimmedName = editingName.trim();
    if (trimmedName && trimmedName !== node.name) {
      renameNode(node.id, trimmedName);
    }
    setIsEditing(false);
  }, [editingName, node.name, node.id, renameNode]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingName(node.name);
  }, [node.name]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  const handlePolicyClick = useCallback((policyId: string) => {
    if (onPolicyClick) {
      onPolicyClick(policyId);
    }
  }, [onPolicyClick]);





  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (node.type === 'root') {
      return; // Cannot delete root node
    }

    const nodeData = data as unknown as NodeData;
    if (nodeData.onDeleteNode) {
      nodeData.onDeleteNode(node);
    }
  }, [data, node]);

  return (
    <div 
      className={`relative transition-all duration-200 ${!isInInheritancePath ? 'opacity-30' : 'opacity-100'}`}
      data-node-type={node.type}
    >
      {/* Policy Badges - SCPs on the left */}
      {nodePolicyInfo && nodePolicyInfo.scps.length > 0 && (
        <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
          {nodePolicyInfo.scps.map((scp, index) => (
            <PolicyBadge
              key={`scp-${index}`}
              type="scp"
              clickable
              onClick={() => handlePolicyClick(scp.id)}
            >
              {scp.name}
            </PolicyBadge>
          ))}
        </div>
      )}

      {/* Policy Badges - RCPs on the right */}
      {nodePolicyInfo && nodePolicyInfo.rcps.length > 0 && (
        <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
          {nodePolicyInfo.rcps.map((rcp, index) => (
            <PolicyBadge
              key={`rcp-${index}`}
              type="rcp"
              clickable
              onClick={() => handlePolicyClick(rcp.id)}
            >
              {rcp.name}
            </PolicyBadge>
          ))}
        </div>
      )}

      {/* Connection Handles - Using React Flow default styles */}
      {node.type !== 'root' && (
        <Handle
          type="target"
          position={Position.Top}
        />
      )}

      {node.type !== 'account' && (
        <Handle
          type="source"
          position={Position.Bottom}
        />
      )}

      <Card
        className={`
          p-3 sm:p-4 cursor-pointer transition-all duration-200 w-fit min-w-[120px]
          ${nodeStyles}
          ${isSelected
            ? 'ring-2 ring-blue-500 shadow-lg'
            : 'hover:shadow-md hover:ring-1 hover:ring-gray-400'
          }
        `}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
        role="button"
        tabIndex={0}
        aria-label={`${node.type} node: ${node.name}`}
        aria-selected={isSelected}
        onKeyDown={(e) => {
          if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleSelect(e);
          }
        }}
      >
        {/* Delete button (only for non-root nodes) */}
        {node.type !== 'root' && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-5 w-5 p-0 opacity-40 hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            onClick={handleDelete}
            aria-label={`Delete ${node.name}`}
            title={`Delete ${node.name}`}
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {/* Node Header */}
        <div className={`flex items-center space-x-2 pr-6 ${(node.type !== 'account' || hasChildren) ? 'mb-3' : 'mb-0'}`}>
          {nodeIcon}
          <div className="flex-1">
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveEdit}
                className="font-medium text-xs sm:text-sm h-6 px-1 py-0 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-500"
                style={{ width: `${Math.max(node.name.length * 8 + 16, 80)}px` }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className="font-medium text-xs sm:text-sm whitespace-nowrap">{node.name}</h3>
            )}
            <p className="text-xs text-muted-foreground capitalize hidden sm:block whitespace-nowrap">
              {node.type === 'ou' ? 'Organizational Unit' :
                node.type === 'root' ? 'Organization Root' : 'Account'}
            </p>
            <p className="text-xs text-muted-foreground capitalize sm:hidden whitespace-nowrap">
              {node.type === 'ou' ? 'OU' :
                node.type === 'root' ? 'Root' : 'Account'}
            </p>
          </div>
        </div>

        {/* Bottom sections - only render if there's content */}
        {(node.type !== 'account' || hasChildren) && (
          <div className="space-y-2">
            {/* Action Buttons */}
            {node.type !== 'account' && (
              <div className="flex">
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex-1 text-xs h-5 sm:h-6 justify-center ${
                    node.type === 'root' ? 'text-foreground hover:text-foreground' : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const nodeData = data as unknown as NodeData;
                    if (nodeData.onAddNode) {
                      nodeData.onAddNode(node);
                    }
                  }}
                  aria-label="Add child node"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Add Node</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            )}
          </div>
        )}


      </Card>
    </div>
  );
});