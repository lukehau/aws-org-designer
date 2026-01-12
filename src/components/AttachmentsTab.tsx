/**
 * AttachmentsTab Component
 * Replaces PolicyLibrary with a multi-select based interface for policy attachments
 */

import { useCallback, useMemo, useRef } from 'react';
import type { OrganizationNode } from '@/types/organization';
import type { Policy, PolicyType } from '@/types/policy';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import type { MultiSelectOption, MultiSelectRef } from '@/components/ui/multi-select';
import { PolicyBadge } from '@/components/ui/policy-badge';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { getPolicyPluralName, getPolicyAbbreviation } from '@/config/policyConfig';

interface AttachmentsTabProps {
  selectedNode?: OrganizationNode | null;
}

export function AttachmentsTab({ selectedNode }: AttachmentsTabProps) {
  // Empty state when no node is selected
  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Select a node to manage policy attachments
          </p>
        </div>
      </div>
    );
  }

  // Policy attachment interface when node is selected
  return (
    <PolicyAttachmentInterface selectedNode={selectedNode} />
  );
}

interface PolicyAttachmentInterfaceProps {
  selectedNode: OrganizationNode;
}

function PolicyAttachmentInterface({ selectedNode }: PolicyAttachmentInterfaceProps) {
  return (
    <div className="space-y-6 p-4">
      {/* Service Control Policies Section */}
      <PolicySection
        policyType="scp"
        selectedNode={selectedNode}
      />

      {/* Resource Control Policies Section */}
      <PolicySection
        policyType="rcp"
        selectedNode={selectedNode}
      />

      {/* Inherited Policies Section */}
      <InheritedPoliciesSection selectedNode={selectedNode} />
    </div>
  );
}

interface PolicySectionProps {
  policyType: PolicyType;
  selectedNode: OrganizationNode;
}

function PolicySection({ policyType, selectedNode }: PolicySectionProps) {
  // Get store functions and data
  const {
    getPoliciesByType,
    getNodeDirectPolicyAttachments,
    attachPolicy,
    detachPolicy,
    validatePolicyAttachment,
    validatePolicyDetachment
  } = useAppStore();

  // Ref for controlling the MultiSelect component
  const multiSelectRef = useRef<MultiSelectRef>(null);

  // Get all policies of this type from the store
  const policies = getPoliciesByType(policyType);

  // Get directly attached policy IDs for this node and policy type
  const directAttachments = getNodeDirectPolicyAttachments(selectedNode.id);
  const attachedPolicyIds = directAttachments
    .map(attachment => attachment.policyId)
    .filter(policyId => {
      // Ensure the policy exists and matches the current policy type
      const policy = policies.find(p => p.id === policyId);
      return policy?.type === policyType;
    });

  // Memoize policy options to prevent unnecessary re-renders
  const policyOptions = useMemo(() => {
    return policies.map((policy: Policy): MultiSelectOption => ({
      value: policy.id,
      label: policy.name,
    }));
  }, [policies]);

  // Handle policy selection changes
  const handlePolicyChange = useCallback(async (selectedPolicyIds: string[]) => {
    try {
      const currentAttachments = attachedPolicyIds;
      const toAttach = selectedPolicyIds.filter(id => !currentAttachments.includes(id));
      const toDetach = currentAttachments.filter(id => !selectedPolicyIds.includes(id));

      // Validate attachments first
      if (toAttach.length > 0) {
        // Check if attaching these policies would exceed AWS limits
        const totalAfterAttachment = currentAttachments.length + toAttach.length;
        if (totalAfterAttachment > 5) {
          toast.error(`${getPolicyAbbreviation(policyType)} Attachment Failed`, {
            description: `Cannot attach more than 5 ${getPolicyPluralName(policyType)} to a single node`,
            duration: 5000
          });
          // Reset the MultiSelect to show the current state (validation failed)
          if (multiSelectRef.current) {
            multiSelectRef.current.setSelectedValues(attachedPolicyIds);
          }
          return;
        }

        // Validate each attachment
        for (const policyId of toAttach) {
          const validation = validatePolicyAttachment(selectedNode.id, policyId);
          if (!validation.isValid) {
            validation.errors.forEach(error => {
              toast.error(`${getPolicyAbbreviation(policyType)} Attachment Failed`, {
                description: error.message,
                duration: 5000
              });
            });
            // Reset the MultiSelect to show the current state (validation failed)
            if (multiSelectRef.current) {
              multiSelectRef.current.setSelectedValues(attachedPolicyIds);
            }
            return;
          }
        }
      }

      // Validate detachments
      if (toDetach.length > 0) {
        for (const policyId of toDetach) {
          const validation = validatePolicyDetachment(selectedNode.id, policyId);
          if (!validation.isValid) {
            validation.errors.forEach(error => {
              toast.error(`${getPolicyAbbreviation(policyType)} Detachment Failed`, {
                description: error.message,
                duration: 5000
              });
            });
            // Reset the MultiSelect to show the current state (validation failed)
            if (multiSelectRef.current) {
              multiSelectRef.current.setSelectedValues(attachedPolicyIds);
            }
            return;
          }
        }
      }

      // Perform attachment operations
      toAttach.forEach(policyId => {
        attachPolicy(selectedNode.id, policyId);
      });

      // Perform detachment operations
      toDetach.forEach(policyId => {
        detachPolicy(selectedNode.id, policyId);
      });

      // Success notifications
      if (toAttach.length > 0) {
        toast.success(`${getPolicyPluralName(policyType)} Attached`, {
          description: `${toAttach.length} ${toAttach.length === 1 ? getPolicyAbbreviation(policyType) : getPolicyPluralName(policyType)} attached successfully`,
          duration: 3000
        });
      }

      if (toDetach.length > 0) {
        toast.success(`${getPolicyPluralName(policyType)} Detached`, {
          description: `${toDetach.length} ${toDetach.length === 1 ? getPolicyAbbreviation(policyType) : getPolicyPluralName(policyType)} detached successfully`,
          duration: 3000
        });
      }

    } catch (error) {
      toast.error('Operation Failed', {
        description: `Failed to update ${getPolicyPluralName(policyType)} attachments: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000
      });
      // Reset the MultiSelect to show the current state (operation failed)
      if (multiSelectRef.current) {
        multiSelectRef.current.setSelectedValues(attachedPolicyIds);
      }
    }
  }, [selectedNode.id, policyType, attachedPolicyIds, attachPolicy, detachPolicy, validatePolicyAttachment, validatePolicyDetachment]);

  // Section title and configuration
  const sectionTitle = getPolicyPluralName(policyType);
  const placeholder = `Select ${getPolicyAbbreviation(policyType)}`;
  const attachedCount = attachedPolicyIds.length;

  return (
    <div className="space-y-3">
      {/* Section Header with count badge */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{sectionTitle}</h3>
        {attachedCount > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {attachedCount}
          </Badge>
        )}
      </div>

      {/* Multi-select component with ref for validation control */}
      <MultiSelect
        ref={multiSelectRef}
        options={policyOptions}
        defaultValue={attachedPolicyIds}
        onValueChange={handlePolicyChange}
        placeholder={placeholder}
        hideClearAll={true}
        hideSelectAll={true}
        smartTruncate={true}
        policyType={policyType}
      />
    </div>
  );
}

interface InheritedPoliciesSectionProps {
  selectedNode: OrganizationNode;
}

function InheritedPoliciesSection({ selectedNode }: InheritedPoliciesSectionProps) {
  const { getNodeInheritedPolicies, centerViewOnNode, getNode } = useAppStore();

  // Get inherited policies data
  const inheritedPoliciesData = useMemo(() => {
    return getNodeInheritedPolicies(selectedNode.id);
  }, [getNodeInheritedPolicies, selectedNode.id]);

  // Check if there are any inherited policies
  const hasInheritedPolicies = useMemo(() => {
    return inheritedPoliciesData.inheritedPolicies.scps.length > 0 || 
           inheritedPoliciesData.inheritedPolicies.rcps.length > 0;
  }, [inheritedPoliciesData]);

  // Handle clicking on an inherited policy badge
  const handlePolicyBadgeClick = useCallback((inheritedFrom: string) => {
    centerViewOnNode(inheritedFrom);
  }, [centerViewOnNode]);

  // Get the display name for a source node
  const getSourceNodeName = useCallback((nodeId: string) => {
    const node = getNode(nodeId);
    return node?.name || 'Unknown Node';
  }, [getNode]);

  // Don't render anything if there are no inherited policies
  if (!hasInheritedPolicies) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Inherited Policies</h3>
        <Badge variant="secondary" className="ml-auto">
          {inheritedPoliciesData.inheritedPolicies.scps.length + inheritedPoliciesData.inheritedPolicies.rcps.length}
        </Badge>
      </div>

      {/* Inherited SCPs */}
      {inheritedPoliciesData.inheritedPolicies.scps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Service Control Policies</h4>
          <div className="flex flex-wrap gap-2">
            {inheritedPoliciesData.inheritedPolicies.scps.map((item, index) => (
              <PolicyBadge
                key={`inherited-scp-${item.policy.id}-${index}`}
                type="scp"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handlePolicyBadgeClick(item.inheritedFrom)}
                title={`Inherited from: ${getSourceNodeName(item.inheritedFrom)}`}
              >
                {item.policy.name}
              </PolicyBadge>
            ))}
          </div>
        </div>
      )}

      {/* Inherited RCPs */}
      {inheritedPoliciesData.inheritedPolicies.rcps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Resource Control Policies</h4>
          <div className="flex flex-wrap gap-2">
            {inheritedPoliciesData.inheritedPolicies.rcps.map((item, index) => (
              <PolicyBadge
                key={`inherited-rcp-${item.policy.id}-${index}`}
                type="rcp"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handlePolicyBadgeClick(item.inheritedFrom)}
                title={`Inherited from: ${getSourceNodeName(item.inheritedFrom)}`}
              >
                {item.policy.name}
              </PolicyBadge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}