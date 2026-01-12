/**
 * Organization Tree Visualization using React Flow
 * Provides interactive visualization of AWS Organization structure
 * Optimized for performance with large datasets
 */

import { useCallback, useEffect, useMemo, useState, memo } from 'react';

// Simple debounce utility to avoid lodash dependency issues
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
import { getLayoutedElements } from '@/utils/layout';
import { useTutorial } from '@/hooks/useTutorial';
import { useTheme } from '@/components/theme-provider';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  ControlButton,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react';
import type {
  Node,
  Edge,
  Connection,
  EdgeChange,
  OnConnect,
  OnEdgesChange,
  IsValidConnection,
  OnNodeDrag,
  ConnectionMode,
} from '@xyflow/react';

import { useAppStore } from '@/store';
import type { OrganizationNode as OrgNode } from '@/types/organization';
import type { Policy } from '@/types/policy';
import { OrganizationNode } from './OrganizationNode';
import { NodeAdditionInterface } from './NodeAdditionInterface';
import { OrganizationCreationDialog } from './OrganizationCreationDialog';
import { OrganizationCreationForm } from './OrganizationCreationForm';
import { PolicyViewer } from './PolicyTab';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LayoutGrid, Plus, Upload, Eye, EyeOff, ZoomIn, ZoomOut, Maximize, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Custom node types
const nodeTypes = {
  organizationNode: OrganizationNode,
};

/**
 * Convert organization data to React Flow nodes and edges
 * Memoized for performance with large datasets
 */
const useOrganizationFlow = (onAddNode?: (node: OrgNode) => void, onDeleteNode?: (node: OrgNode) => void, onPolicyClick?: (policyId: string) => void, theme?: 'dark' | 'light') => {
  const { organization, updateNodePosition, inheritanceTrailNodeId, getNodePath, policies, policyAttachments } = useAppStore();

  const { nodes, edges } = useMemo(() => {
    if (!organization) {
      return { nodes: [], edges: [] };
    }

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const nodeValues = Object.values(organization.nodes);
    
    // Edge color based on theme
    const defaultEdgeColor = theme === 'dark' ? '#e5e5e5' : '#333333';

    // Convert organization nodes to React Flow nodes
    nodeValues.forEach((orgNode) => {
      flowNodes.push({
        id: orgNode.id,
        type: 'organizationNode',
        position: orgNode.position,
        data: {
          node: orgNode,
          organization,
          onAddNode,
          onDeleteNode,
          onPolicyClick,
        },
        draggable: true,
      });

      // Create edges for parent-child relationships
      if (orgNode.parentId) {
        // Determine if this edge should be transparent based on inheritance trail
        let edgeOpacity = 1;
        let edgeColor = defaultEdgeColor;

        if (inheritanceTrailNodeId) {
          const selectedNodePath = getNodePath(inheritanceTrailNodeId);
          const sourceInPath = selectedNodePath.some(pathNode => pathNode.id === orgNode.parentId);
          const targetInPath = selectedNodePath.some(pathNode => pathNode.id === orgNode.id);

          // Edge should be transparent if either source or target is not in the inheritance path
          if (!sourceInPath || !targetInPath) {
            edgeOpacity = 0.3;
          }
        }

        flowEdges.push({
          id: `${orgNode.parentId}-${orgNode.id}`,
          source: orgNode.parentId,
          target: orgNode.id,
          type: 'smoothstep',
          style: {
            stroke: edgeColor,
            strokeWidth: 2,
            opacity: edgeOpacity,
          },
        });
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [organization, onAddNode, onDeleteNode, onPolicyClick, inheritanceTrailNodeId, getNodePath, policies, policyAttachments, theme]);

  // Debounced position update for smooth dragging
  const debouncedUpdatePosition = useMemo(
    () => debounce((nodeId: string, position: { x: number; y: number }) => {
      updateNodePosition(nodeId, position);
    }, 300),
    [updateNodePosition]
  );

  return {
    nodes,
    edges,
    updateNodePosition: debouncedUpdatePosition,
  };
};

/**
 * Organization Tree Component
 * Optimized for performance with large datasets
 */
const OrganizationTreeInternal = memo(() => {
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [selectedNodeForAdd, setSelectedNodeForAdd] = useState<OrgNode | null>(null);
  const [isAutoArranging, setIsAutoArranging] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [selectedPolicyForView, setSelectedPolicyForView] = useState<Policy | null>(null);

  const {
    importOrganization,
    clearInheritanceTrail,
    selectNode,
    centerViewOnNodeId,
    clearCenterViewRequest,
    showAllPolicyBadges,
    toggleShowAllPolicyBadges,
    getPolicy,
    deletePolicy,
    setReactFlowInstance
  } = useAppStore();
  const reactFlowInstance = useReactFlow();
  const { setCenter, getNode, getViewport, zoomIn, zoomOut, fitView } = reactFlowInstance;

  const handleAddNode = useCallback((node: OrgNode) => {
    console.log('OrganizationTree: handleAddNode called for', node.name);
    setSelectedNodeForAdd(node);
    setAddNodeDialogOpen(true);
  }, []);

  const handleDeleteNode = useCallback((node: OrgNode) => {
    setNodeToDelete({ id: node.id, name: node.name });
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (nodeToDelete) {
      const { deleteNode } = useAppStore.getState();
      deleteNode(nodeToDelete.id);
      setDeleteDialogOpen(false);
      setNodeToDelete(null);
    }
  }, [nodeToDelete]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setNodeToDelete(null);
  }, []);

  const handlePolicyClick = useCallback((policyId: string) => {
    const policy = getPolicy(policyId);
    if (policy) {
      setSelectedPolicyForView(policy);
      setShowPolicyDialog(true);
    }
  }, [getPolicy]);

  const handleDeletePolicy = useCallback((policy: Policy) => {
    deletePolicy(policy.id);
    setShowPolicyDialog(false);
    setSelectedPolicyForView(null);
  }, [deletePolicy]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      importOrganization(file).catch(error => {
        console.error('Failed to import organization:', error);
      });
    } else if (file) {
      alert('Please select a valid JSON file');
    }
    // Reset file input
    setFileInputKey(prev => prev + 1);
  }, [importOrganization]);

  const handleLoadSample = useCallback(async (silent = false) => {
    try {
      const response = await fetch('/sample-aws-organization.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch sample: ${response.statusText}`);
      }
      const blob = await response.blob();
      const file = new File([blob], 'sample-aws-organization.json', { type: 'application/json' });

      await importOrganization(file, silent);
    } catch (error) {
      console.error('Failed to load sample organization:', error);
      alert('Failed to load sample organization. Please try again.');
    }
  }, [importOrganization]);

  const { startTutorial } = useTutorial();
  const { theme } = useTheme();

  const handleStartTutorial = useCallback(async () => {
    try {
      // First, load the sample organization silently (no toast)
      await handleLoadSample(true);
      
      // Wait a bit for the organization to render
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Start the tutorial
      startTutorial();
    } catch (error) {
      console.error('Failed to start tutorial:', error);
      alert('Failed to start tutorial. Please try again.');
    }
  }, [handleLoadSample, startTutorial]);

  const { nodes: orgNodes, edges: orgEdges, updateNodePosition } = useOrganizationFlow(handleAddNode, handleDeleteNode, handlePolicyClick, theme);
  const [nodes, setNodes, onNodesChange] = useNodesState(orgNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(orgEdges);

  // Store ReactFlow instance in the store for download functionality
  useEffect(() => {
    setReactFlowInstance(reactFlowInstance);
    return () => {
      setReactFlowInstance(null);
    };
  }, [reactFlowInstance, setReactFlowInstance]);

  // Sync store changes to React Flow state (but not during auto-arrange)
  useEffect(() => {
    if (!isAutoArranging) {
      setNodes(orgNodes);
    }
  }, [orgNodes, setNodes, isAutoArranging]);

  useEffect(() => {
    setEdges(orgEdges);
  }, [orgEdges, setEdges]);

  // Handle center view requests
  useEffect(() => {
    if (centerViewOnNodeId) {
      const node = getNode(centerViewOnNodeId);
      if (node) {
        // Get current viewport to maintain zoom level
        const viewport = getViewport();
        // Calculate the center position accounting for current zoom and pan
        const centerX = node.position.x + (node.width || 280) / 2;
        const centerY = node.position.y + (node.height || 140) / 2;

        setCenter(centerX, centerY, {
          zoom: viewport.zoom, // Maintain current zoom level
          duration: 800
        });
      }
      clearCenterViewRequest();
    }
  }, [centerViewOnNodeId, getNode, setCenter, getViewport, clearCenterViewRequest]);

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Simplified connection validation using React Flow's built-in feature
  const isValidConnection: IsValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const { source, target } = connection;

      if (!source || !target || source === target) return false;

      const { organization, validateNodeCreation } = useAppStore.getState();
      if (!organization) return false;

      const sourceNode = organization.nodes[source];
      const targetNode = organization.nodes[target];

      if (!sourceNode || !targetNode) return false;

      // Cannot move root node
      if (targetNode.type === 'root') return false;

      // Check if source is a descendant of target (would create a cycle)
      const isDescendant = (ancestorId: string, descendantId: string): boolean => {
        const descendant = organization.nodes[descendantId];
        if (!descendant || !descendant.parentId) return false;
        if (descendant.parentId === ancestorId) return true;
        return isDescendant(ancestorId, descendant.parentId);
      };

      if (isDescendant(target, source)) return false;

      // Use existing validation from store
      const validation = validateNodeCreation(source, targetNode.type);
      return validation.isValid;
    },
    []
  );

  // Simplified connection handler - just handle the move
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const { source, target } = params;

      if (!source || !target) return;

      console.log('Moving node', target, 'to parent', source);

      // Move the target node to be a child of the source node
      const { moveNode } = useAppStore.getState();
      moveNode(target, source);
    },
    []
  );

  // Simplified position updates using onNodeDragStop
  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  // Auto-arrange handler - hybrid approach for best of both worlds
  const handleAutoArrange = useCallback(() => {
    setIsAutoArranging(true);

    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, {
      direction: 'TB',
      nodeWidth: 280,
      nodeHeight: 140,
      rankSep: 60, // Much more compact vertical spacing
      nodeSep: 30, // Much more compact horizontal spacing
    });

    // Update React Flow immediately for instant visual feedback
    setNodes(layoutedNodes);

    // Update store positions (without debounce for immediate persistence)
    const { updateNodePosition: storeUpdatePosition } = useAppStore.getState();
    layoutedNodes.forEach((node) => {
      storeUpdatePosition(node.id, node.position);
    });

    // Re-enable store sync after positions are updated
    setTimeout(() => {
      setIsAutoArranging(false);
    }, 100);
  }, [nodes, edges, setNodes]);

  const handlePaneClick = useCallback(() => {
    // Clear inheritance trail and node selection when clicking on empty space
    clearInheritanceTrail();
    selectNode(null);
  }, [clearInheritanceTrail, selectNode]);

  const handleConnectionStart = useCallback(() => {
    // Clear inheritance trail when starting a connection drag
    clearInheritanceTrail();
    selectNode(null);
  }, [clearInheritanceTrail, selectNode]);

  if (!nodes.length) {
    return (
      <div className="flex flex-col items-center justify-start pt-8 sm:justify-center sm:pt-0 h-full text-center space-y-4 sm:space-y-6 px-4">
        <div className="w-full max-w-lg">
          <h3 className="text-xl sm:text-2xl font-medium mb-3">No Organization</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
            Create or import an organization to start visualizing your AWS structure with SCPs and RCPs. Else, load a sample Organization.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
            <div className="w-full sm:w-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full sm:w-auto items-center justify-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Organization
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Organization</DialogTitle>
                  </DialogHeader>
                  <OrganizationCreationForm />
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative w-full sm:w-auto">
              <input
                key={fileInputKey}
                type="file"
                accept=".json,application/json"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto items-center justify-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Organization
              </Button>
            </div>

            <Button
              size="lg"
              onClick={handleStartTutorial}
              variant="outline"
              className="w-full sm:w-auto items-center justify-center"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
            </Button>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onConnectStart={handleConnectionStart}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={handlePaneClick}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        colorMode={theme}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        snapToGrid={true}
        snapGrid={[20, 20]}
        connectionLineStyle={{
          stroke: 'hsl(var(--primary))',
          strokeWidth: 3,
          strokeDasharray: '5,5',
        }}
        connectionMode={'loose' as ConnectionMode}
        connectOnClick={false}
        autoPanOnConnect={true}
        connectionRadius={30}

      >
        <Controls
          position="top-left"
          showZoom={false}
          showFitView={false}
          showInteractive={false}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={() => zoomIn()}>
                <ZoomIn className="w-4 h-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={() => zoomOut()}>
                <ZoomOut className="w-4 h-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={() => fitView()}>
                <Maximize className="w-4 h-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fit View</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleAutoArrange}>
                <LayoutGrid className="w-4 h-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Auto Arrange</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton
                onClick={toggleShowAllPolicyBadges}
                className={showAllPolicyBadges ? "bg-accent" : ""}
                data-tutorial-id="toggle-policy-badges"
              >
                {showAllPolicyBadges ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showAllPolicyBadges ? "Hide Policy Attachments" : "Show Policy Attachments"}</p>
            </TooltipContent>
          </Tooltip>
        </Controls>

        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />
      </ReactFlow>

      {/* Add Node Dialog */}
      <Dialog open={addNodeDialogOpen} onOpenChange={setAddNodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Node</DialogTitle>
          </DialogHeader>
          {selectedNodeForAdd && (
            <NodeAdditionInterface
              parentNode={selectedNodeForAdd}
              onCancel={() => {
                setAddNodeDialogOpen(false);
                setSelectedNodeForAdd(null);
              }}
              onSuccess={() => {
                setAddNodeDialogOpen(false);
                setSelectedNodeForAdd(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Organization Creation Dialog */}
      <OrganizationCreationDialog />

      {/* Policy Viewer Dialog */}
      <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <DialogContent className="!max-w-4xl">
          <DialogHeader>
            <DialogTitle>View Policy</DialogTitle>
          </DialogHeader>
          {selectedPolicyForView && (
            <PolicyViewer
              policy={selectedPolicyForView}
              onDeletePolicy={handleDeletePolicy}
              onClose={() => setShowPolicyDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{nodeToDelete?.name}" and all its children?
              This action cannot be undone.
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
    </div>
  );
});

OrganizationTreeInternal.displayName = 'OrganizationTreeInternal';

export function OrganizationTree() {
  return <OrganizationTreeInternal />;
}

/**
 * Organization Tree with Provider
 * Wraps the tree in ReactFlowProvider for proper context
 */
export function OrganizationTreeProvider() {
  return (
    <ReactFlowProvider>
      <OrganizationTree />
    </ReactFlowProvider>
  );
}