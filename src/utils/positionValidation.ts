/**
 * Position validation utilities for debugging layout issues
 */

import type { OrganizationNode } from '@/types/organization';

export interface PositionConflict {
  node1: OrganizationNode;
  node2: OrganizationNode;
  distance: number;
  minDistance: number;
}

/**
 * Check for position conflicts between nodes
 */
export const validateNodePositions = (
  nodes: Record<string, OrganizationNode>,
  config = { nodeWidth: 280, nodeHeight: 140, minHorizontalSpacing: 120, minVerticalSpacing: 160 }
): PositionConflict[] => {
  const conflicts: PositionConflict[] = [];
  const nodeArray = Object.values(nodes);
  
  for (let i = 0; i < nodeArray.length; i++) {
    for (let j = i + 1; j < nodeArray.length; j++) {
      const node1 = nodeArray[i];
      const node2 = nodeArray[j];
      
      // Skip parent-child relationships as they're expected to be close
      if (node1.parentId === node2.id || node2.parentId === node1.id) {
        continue;
      }
      
      const horizontalDistance = Math.abs(node1.position.x - node2.position.x);
      const verticalDistance = Math.abs(node1.position.y - node2.position.y);
      
      // Check for horizontal conflicts (same level)
      if (verticalDistance < config.minVerticalSpacing / 2) {
        if (horizontalDistance < config.minHorizontalSpacing) {
          conflicts.push({
            node1,
            node2,
            distance: horizontalDistance,
            minDistance: config.minHorizontalSpacing
          });
        }
      }
      
      // Check for vertical conflicts (same column)
      if (horizontalDistance < config.nodeWidth / 2) {
        if (verticalDistance < config.minVerticalSpacing) {
          conflicts.push({
            node1,
            node2,
            distance: verticalDistance,
            minDistance: config.minVerticalSpacing
          });
        }
      }
    }
  }
  
  return conflicts;
};

/**
 * Log position conflicts to console for debugging
 */
export const logPositionConflicts = (nodes: Record<string, OrganizationNode>) => {
  const conflicts = validateNodePositions(nodes);
  
  if (conflicts.length === 0) {
    console.log('✅ No position conflicts detected');
    return;
  }
  
  console.warn(`⚠️ Found ${conflicts.length} position conflicts:`);
  conflicts.forEach((conflict, index) => {
    console.warn(`${index + 1}. "${conflict.node1.name}" and "${conflict.node2.name}"`);
    console.warn(`   Distance: ${conflict.distance.toFixed(1)}px (min: ${conflict.minDistance}px)`);
    console.warn(`   Positions: (${conflict.node1.position.x}, ${conflict.node1.position.y}) vs (${conflict.node2.position.x}, ${conflict.node2.position.y})`);
  });
};