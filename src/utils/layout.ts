/**
 * Auto-layout utilities using Dagre
 * Provides automatic positioning for React Flow nodes
 */

import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

export interface LayoutOptions {
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  nodeWidth: number;
  nodeHeight: number;
  rankSep: number;
  nodeSep: number;
}

const defaultOptions: LayoutOptions = {
  direction: 'TB', // Top to Bottom
  nodeWidth: 280, // Match actual node width
  nodeHeight: 140, // Match actual node height
  rankSep: 60, // Much more compact vertical spacing
  nodeSep: 30,  // Much more compact horizontal spacing
};



/**
 * Apply safe centering that prevents node overlaps
 */
const applySafeCentering = (nodes: Node[], edges: Edge[], opts: LayoutOptions): Node[] => {
  // Build parent-child relationships
  const parentChildMap = new Map<string, string[]>();
  const childParentMap = new Map<string, string>();
  
  edges.forEach(edge => {
    const children = parentChildMap.get(edge.source) || [];
    children.push(edge.target);
    parentChildMap.set(edge.source, children);
    childParentMap.set(edge.target, edge.source);
  });

  // Create a map for easy node lookup
  const nodeMap = new Map(nodes.map(node => [node.id, { ...node }]));

  // Group nodes by their Y position (same level)
  const nodesByLevel = new Map<number, Node[]>();
  nodes.forEach(node => {
    const level = Math.round(node.position.y);
    const levelNodes = nodesByLevel.get(level) || [];
    levelNodes.push(node);
    nodesByLevel.set(level, levelNodes);
  });

  // Process each parent to center its children, but only if it doesn't cause overlaps
  parentChildMap.forEach((childIds, parentId) => {
    if (childIds.length <= 1) return; // No need to center single child
    
    const parentNode = nodeMap.get(parentId);
    if (!parentNode) return;
    
    const childNodes = childIds.map(id => nodeMap.get(id)!).filter(Boolean);
    if (childNodes.length === 0) return;
    
    // Calculate current center of children
    const childrenMinX = Math.min(...childNodes.map(child => child.position.x));
    const childrenMaxX = Math.max(...childNodes.map(child => child.position.x));
    const childrenCenterX = (childrenMinX + childrenMaxX) / 2;
    
    // Calculate desired center (under parent)
    const parentCenterX = parentNode.position.x + (opts.nodeWidth / 2);
    const offsetX = parentCenterX - childrenCenterX;
    
    // Check if applying this offset would cause overlaps
    const wouldCauseOverlap = childNodes.some(child => {
      const newX = child.position.x + offsetX;
      const childLevel = Math.round(child.position.y);
      const levelNodes = nodesByLevel.get(childLevel) || [];
      
      return levelNodes.some(otherNode => {
        if (otherNode.id === child.id) return false;
        if (childIds.includes(otherNode.id)) return false; // Skip siblings
        
        const distance = Math.abs(newX - otherNode.position.x);
        return distance < opts.nodeWidth + opts.nodeSep;
      });
    });
    
    // Only apply centering if it doesn't cause overlaps
    if (!wouldCauseOverlap) {
      childNodes.forEach(child => {
        child.position.x += offsetX;
      });
    }
  });
  
  return Array.from(nodeMap.values());
};

/**
 * Apply Dagre layout to React Flow nodes and edges
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  options: Partial<LayoutOptions> = {}
) => {
  const opts = { ...defaultOptions, ...options };
  
  // Create a new graph instance to avoid state issues
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  
  // Configure the graph for proper hierarchical layout
  graph.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
    edgesep: 10, // Very compact edge separation
    marginx: 20, // Minimal margins for maximum space utilization
    marginy: 20,
    align: 'DL', // Align to down-left for better centering
  });

  // Reset all node positions to force fresh layout calculation
  const resetNodes = nodes.map(node => ({
    ...node,
    position: { x: 0, y: 0 }
  }));

  // Add nodes to dagre graph (without existing positions)
  resetNodes.forEach((node) => {
    graph.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(graph);

  // Apply calculated positions to nodes
  const layoutedNodes = resetNodes.map((node) => {
    const nodeWithPosition = graph.node(node.id);
    const newPosition = {
      x: nodeWithPosition.x - opts.nodeWidth / 2,
      y: nodeWithPosition.y - opts.nodeHeight / 2,
    };
    
    return {
      ...node,
      position: newPosition,
    };
  });

  // Apply safe centering that prevents overlaps
  const centeredNodes = applySafeCentering(layoutedNodes, edges, opts);

  return { nodes: centeredNodes, edges };
};