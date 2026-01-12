/**
 * Policy File Tree Component
 * Custom collapsible file tree inspired by sidebar-11 but using regular components
 */

import { useState } from 'react';
import { ChevronRight } from "lucide-react";
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { AwsPolicyIcon } from '@/components/icons/aws-icons';
import type { Policy } from '@/types/policy';
import type { OrganizationNode } from '@/types/organization';

interface PolicyFileTreeProps {
  selectedNode?: OrganizationNode | null;
  onViewPolicy: (policy: Policy) => void;
}

export function PolicyFileTree({ selectedNode, onViewPolicy }: PolicyFileTreeProps) {
  const { getPoliciesByType } = useAppStore();
  
  const scpPolicies = getPoliciesByType('scp');
  const rcpPolicies = getPoliciesByType('rcp');

  // selectedNode will be used for future policy attachment functionality
  console.debug('Selected node for policy management:', selectedNode?.id);

  const handlePolicyClick = (policyName: string) => {
    const allPolicies = [...scpPolicies, ...rcpPolicies];
    const policy = allPolicies.find(p => p.name === policyName);
    if (policy) {
      onViewPolicy(policy);
    }
  };

  return (
    <div className="space-y-1">
      <PolicyFolder
        name="Service Control Policies"
        policies={scpPolicies}
        onPolicyClick={handlePolicyClick}
        emptyMessage="No SCPs"
      />
      <PolicyFolder
        name="Resource Control Policies"
        policies={rcpPolicies}
        onPolicyClick={handlePolicyClick}
        emptyMessage="No RCPs"
      />
    </div>
  );
}

interface PolicyFolderProps {
  name: string;
  policies: Policy[];
  onPolicyClick: (policyName: string) => void;
  emptyMessage: string;
}

function PolicyFolder({ name, policies, onPolicyClick, emptyMessage }: PolicyFolderProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Sort policies alphabetically by name
  const sortedPolicies = [...policies].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-1">
      {/* Folder Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1.5 text-sm font-semibold rounded-md",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "transition-colors"
        )}
      >
        <ChevronRight 
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-90"
          )} 
        />
        <span>{name}</span>
      </button>

      {/* Folder Content */}
      {isOpen && (
        <div className="ml-6 space-y-1">
          {sortedPolicies.length === 0 ? (
            <div className="px-2 py-1 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            sortedPolicies.map((policy) => (
              <PolicyItem
                key={policy.id}
                policy={policy}
                onPolicyClick={onPolicyClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface PolicyItemProps {
  policy: Policy;
  onPolicyClick: (policyName: string) => void;
}

function PolicyItem({ policy, onPolicyClick }: PolicyItemProps) {
  return (
    <button
      onClick={() => onPolicyClick(policy.name)}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 text-xs font-normal rounded-md",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "transition-colors text-left"
      )}
    >
      <AwsPolicyIcon size={12} className="text-foreground flex-shrink-0" />
      <span className="truncate">{policy.name}</span>
    </button>
  );
}