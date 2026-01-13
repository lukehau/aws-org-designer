/**
 * Tutorial Configuration for Driver.js
 * Defines all tutorial steps and driver configuration
 */

import type { DriveStep, Config, DriveStep as Step } from 'driver.js';

// Type for the options parameter in navigation callbacks
interface NavigationOptions {
  driver: {
    moveNext: () => void;
    movePrevious: () => void;
  };
}

/**
 * Tutorial step descriptions
 * Extracted for better readability and easier editing
 */
const descriptions = {
  organizationCanvas: `
    This is the main canvas where you can design and visualise your AWS Organization.<br/><br/>
    Nodes represent your Root, Organizational Units (OUs), and Accounts in a hierarchical tree.<br/><br/>
    You can reorganize your structure by dragging nodes between parents - simply drag a node onto a new parent to move it.
  `,
  
  controlsPanel: `
    Use these controls to manipulate the canvas:<br/><br/>
    <strong>Zoom In/Out</strong> - Adjust your view<br/>
    <strong>Fit View</strong> - See the entire organization<br/>
    <strong>Auto Arrange</strong> - Organize the nodes into a clean hierarchy<br/>
    <strong>Show Policy Badges</strong> - Show or hide policy attachments
  `,
  
  policyBadgeToggle: `
    Toggle policy badges with the eye icon to see which policies are attached to each node.<br/><br/>
    This helps you visualize policy inheritance throughout your Organization..
  `,
  
  policyLibrary: `
    The Policy Library is where you create and manage your Service Control Policies (SCPs) and Resource Control Policies (RCPs). 
  `,
  
  attachmentsTab: `
    Use the Attachments tab to attach policies to nodes in your organization.<br/><br/>
    <strong>Remember:</strong> Policies inherit down the tree, so attaching a policy to an OU or the Organization root automatically applies it to all child accounts!
  `,
  
  nodeSelection: `
    Click on a node to manage its attachments.
\  `,
  
  headerActions: `
    Use the header controls to download an image of your Organisation. Export it to a JSON file to save it, or import a previously saved design.<br/><br/>
    You can also clear the current Organization to start fresh.
  `,
};

/**
 * Tutorial step definitions
 */
export const tutorialSteps: DriveStep[] = [
  // Step 1: Organization Canvas
  {
    element: '.react-flow',
    popover: {
      description: descriptions.organizationCanvas,
      side: 'bottom',
      align: 'center',
    },
  },

  // Step 2: Controls Panel
  {
    element: '.react-flow__controls',
    popover: {
      description: descriptions.controlsPanel,
      side: 'right',
      align: 'start',
    },
  },

  // Step 3: Policy Badge Toggle
  {
    element: '.react-flow',
    popover: {
      description: descriptions.policyBadgeToggle,
      side: 'bottom',
      align: 'center',
      // Override next button to deactivate badges and switch to Policy Library tab
      onNextClick: (_element: Element | undefined, _step: Step, options: NavigationOptions) => {
        // Deactivate policy badges using store
        const store = (window as any).__appStore;
        if (store && store.getState) {
          const { setShowAllPolicyBadges } = store.getState();
          if (setShowAllPolicyBadges) {
            setShowAllPolicyBadges(false);
          }
        }
        
        // Switch to Policy Library tab
        const tab = document.querySelector('[data-tutorial-id="policy-library-tab"]');
        if (tab instanceof HTMLElement) {
          tab.click();
          // Wait for React to render, then move to next step
          setTimeout(() => options.driver.moveNext(), 150);
        } else {
          options.driver.moveNext();
        }
      },
      onPrevClick: (_element: Element | undefined, _step: Step, options: NavigationOptions) => {
        // Deactivate policy badges when going back
        const store = (window as any).__appStore;
        if (store && store.getState) {
          const { setShowAllPolicyBadges } = store.getState();
          if (setShowAllPolicyBadges) {
            setShowAllPolicyBadges(false);
          }
        }
        options.driver.movePrevious();
      },
    },
    onHighlightStarted: () => {
      // Activate policy badges using store
      const store = (window as any).__appStore;
      if (store && store.getState) {
        const { setShowAllPolicyBadges } = store.getState();
        if (setShowAllPolicyBadges) {
          setShowAllPolicyBadges(true);
        }
      }
    },
  },

  // Step 4: Sidebar - Policy Library
  {
    element: '[data-tutorial-id="sidebar-card"]',
    popover: {
      description: descriptions.policyLibrary,
      side: 'right',
      align: 'start',
      // Override navigation to handle tab switching
      onNextClick: (_element: Element | undefined, _step: Step, options: NavigationOptions) => {
        const tab = document.querySelector('[data-tutorial-id="attachments-tab"]');
        if (tab instanceof HTMLElement) {
          tab.click();
          // Wait for React to render, then move to next step
          setTimeout(() => options.driver.moveNext(), 150);
        } else {
          options.driver.moveNext();
        }
      },
      onPrevClick: (_element: Element | undefined, _step: Step, options: NavigationOptions) => {
        // Just go back normally, no tab switching needed
        options.driver.movePrevious();
      },
    },
  },

  // Step 5: Sidebar - Attachments
  {
    element: '[data-tutorial-id="sidebar-card"]',
    popover: {
      description: descriptions.attachmentsTab,
      side: 'right',
      align: 'start',
      // Override navigation to maintain control
      onNextClick: (_element: Element | undefined, _step: Step, options: NavigationOptions) => {
        // Just move to next step normally
        options.driver.moveNext();
      },
      // Override back button to switch to Policy Library tab before moving
      onPrevClick: (_element: Element | undefined, _step: Step, options: NavigationOptions) => {
        const tab = document.querySelector('[data-tutorial-id="policy-library-tab"]');
        if (tab instanceof HTMLElement) {
          tab.click();
          // Wait for React to render, then move to previous step
          setTimeout(() => options.driver.movePrevious(), 150);
        } else {
          options.driver.movePrevious();
        }
      },
    },
  },

  // Step 6: Node Selection for Attachments
  {
    element: '[data-tutorial-id="workspace-area"]',
    popover: {
      description: descriptions.nodeSelection,
      side: 'left',
      align: 'center',
      onNextClick: (_element: Element | undefined, _step: Step, options: NavigationOptions) => {
        // Get store state
        const store = (window as any).__appStore;
        if (store && store.getState) {
          const { selectNode, clearInheritanceTrail, setShowAllPolicyBadges, reactFlowInstance } = store.getState();
          
          // 1. Deselect the node
          if (selectNode) {
            selectNode(null);
          }
          
          // 2. Clear inheritance trail
          if (clearInheritanceTrail) {
            clearInheritanceTrail();
          }
          
          // 3. Turn off policy badges
          if (setShowAllPolicyBadges) {
            setShowAllPolicyBadges(false);
          }
          
          // 4. Fit view to show entire tree with animation
          if (reactFlowInstance && reactFlowInstance.fitView) {
            reactFlowInstance.fitView({ duration: 600 });
            // Wait for animation to complete before moving to next step
            setTimeout(() => options.driver.moveNext(), 700);
          } else {
            // No animation, move immediately
            options.driver.moveNext();
          }
        } else {
          // No store, move immediately
          options.driver.moveNext();
        }
      },
      onPrevClick: (_element: Element | undefined, _step: Step, options: NavigationOptions) => {
        // Get store state
        const store = (window as any).__appStore;
        if (store && store.getState) {
          const { selectNode, reactFlowInstance } = store.getState();
          
          // Deselect the node
          if (selectNode) {
            selectNode(null);
          }
          
          // Trigger fit view using React Flow instance with animation
          if (reactFlowInstance && reactFlowInstance.fitView) {
            reactFlowInstance.fitView({ duration: 600 });
            // Wait for animation to complete before moving to previous step
            setTimeout(() => options.driver.movePrevious(), 700);
          } else {
            // No animation, move immediately
            options.driver.movePrevious();
          }
        } else {
          // No store, move immediately
          options.driver.movePrevious();
        }
      },
    },
    onHighlightStarted: () => {
      // Return a Promise so driver.js waits for the async operations
      return new Promise<void>((resolve) => {
        // Get store state
        const store = (window as any).__appStore;
        if (store && store.getState) {
          const state = store.getState();
          const { organization, selectNode, reactFlowInstance } = state;
          
          if (organization && organization.nodes && reactFlowInstance) {
            // Find Non-Production OU and root node
            let nonProdId = null;
            let rootId = null;
            for (const nodeId in organization.nodes) {
              const node = organization.nodes[nodeId];
              if (node.name === 'Non-Production OU') {
                nonProdId = nodeId;
              }
              if (node.type === 'root') {
                rootId = nodeId;
              }
            }
            
            if (nonProdId && rootId && selectNode) {
              // Get both nodes from React Flow
              const nonProdNode = reactFlowInstance.getNode(nonProdId);
              const rootNode = reactFlowInstance.getNode(rootId);
              
              if (nonProdNode && rootNode && reactFlowInstance.fitBounds) {
                // Calculate bounds to include both nodes
                const minX = Math.min(nonProdNode.position.x, rootNode.position.x);
                const minY = Math.min(nonProdNode.position.y, rootNode.position.y);
                const maxX = Math.max(
                  nonProdNode.position.x + (nonProdNode.width || 280),
                  rootNode.position.x + (rootNode.width || 280)
                );
                const maxY = Math.max(
                  nonProdNode.position.y + (nonProdNode.height || 140),
                  rootNode.position.y + (rootNode.height || 140)
                );
                
                // Fit view to show both nodes with more padding for better view
                reactFlowInstance.fitBounds(
                  { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
                  { padding: 0.6, duration: 800 }
                );
                
                // Wait for animation to complete, then select the node
                setTimeout(() => {
                  selectNode(nonProdId);
                  // Also set inheritance trail like when clicking a node
                  const { setInheritanceTrailNodeId } = store.getState();
                  if (setInheritanceTrailNodeId) {
                    setInheritanceTrailNodeId(nonProdId);
                  }
                  resolve();
                }, 900);
                return;
              }
            }
          }
        }
        // If anything fails, resolve immediately
        resolve();
      });
    },
  },

  // Step 7: Header Actions
  {
    element: '[data-tutorial-id="header-actions"]',
    popover: {
      description: descriptions.headerActions,
      side: 'bottom',
      align: 'center',
    },
  },
];

/**
 * Global driver configuration
 */
export const driverConfig: Config = {
  // Animation and behavior
  animate: true,
  smoothScroll: true,
  allowClose: true,
  overlayClickBehavior: 'close',
  allowKeyboardControl: true,

  // Styling
  stagePadding: 10,
  stageRadius: 8,
  overlayColor: '#000',
  overlayOpacity: window.matchMedia('(prefers-color-scheme: dark)').matches ? 0.5 : 0.7,

  // Progress and buttons
  showProgress: false,
  nextBtnText: 'Next →',
  prevBtnText: '← Back',
  doneBtnText: 'Get Started!',

  // Popover styling
  popoverClass: 'tutorial-popover',
  popoverOffset: 10,

  // Steps
  steps: tutorialSteps,

  // Lifecycle hooks
  onDestroyed: () => {
    // Get store instance
    const store = (window as any).__appStore;
    if (store && store.getState) {
      const { clearOrganization, setTutorialActive, setTutorialCompleted } = store.getState();
      
      // Clear organization silently
      if (clearOrganization) {
        clearOrganization(true);
      }
      
      // Update tutorial state
      if (setTutorialActive) {
        setTutorialActive(false);
      }
      if (setTutorialCompleted) {
        setTutorialCompleted(true);
      }
    }
  },
};
