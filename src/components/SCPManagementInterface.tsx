/**
 * SCP Management Interface Component
 * Wrapper for the unified PolicyTab for Service Control Policies
 */

import { PolicyTab } from './PolicyTab';
import type { OrganizationNode } from '@/types/organization';

interface SCPManagementInterfaceProps {
  selectedNode?: OrganizationNode | null;
}

export function SCPManagementInterface({ selectedNode }: SCPManagementInterfaceProps) {
  return (
    <PolicyTab 
      selectedNode={selectedNode} 
    />
  );
}

