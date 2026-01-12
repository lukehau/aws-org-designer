/**
 * RCP Management Interface Component
 * Wrapper for the unified PolicyTab for Resource Control Policies
 */

import { PolicyTab } from './PolicyTab';
import type { OrganizationNode } from '@/types/organization';

interface RCPManagementInterfaceProps {
  selectedNode?: OrganizationNode | null;
}

export function RCPManagementInterface({ selectedNode }: RCPManagementInterfaceProps) {
  return (
    <PolicyTab 
      selectedNode={selectedNode} 
    />
  );
}

