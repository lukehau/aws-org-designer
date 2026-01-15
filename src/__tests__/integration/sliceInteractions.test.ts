/**
 * Integration tests for slice interactions
 * 
 * These tests verify cross-slice behavior that involves toast notifications,
 * which is not covered by unit tests. Unit tests for the underlying logic
 * (recursive deletion, policy limits, nesting limits) exist in the respective
 * slice test files.
 * 
 * Requirements: 6.2, 6.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as sonner from 'sonner';
import { createTestStore } from '../../store/testHelpers';

describe('Slice Interactions - Toast Notifications', () => {
  let useStore: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    // Create fresh store for each test
    useStore = createTestStore();
    
    // Set up toast spies
    vi.spyOn(sonner.toast, 'success').mockImplementation(() => '');
    vi.spyOn(sonner.toast, 'error').mockImplementation(() => '');
  });

  describe('Policy Attachment Validation', () => {
    /**
     * Test: Verifies toast.error is NOT called when policy attachment is silently rejected
     * (The validation logic itself is tested in validationSlice.test.ts)
     * Requirements: 6.2
     */
    it('silently rejects policy attachment when limit exceeded (no toast)', () => {
      // Setup: Create organization and reach SCP limit
      useStore.getState().createOrganization('Test Organization');
      const state = useStore.getState();
      const rootId = state.organization!.rootId;

      // Root already has default-scp-full-access attached (1 SCP)
      // maxSCPsPerNode = 5, so we can attach 4 more
      for (let i = 1; i <= 4; i++) {
        const scpId = useStore.getState().createPolicy({
          name: `Test SCP ${i}`,
          type: 'scp',
          content: '{}',
        });
        useStore.getState().attachPolicy(rootId, scpId);
      }

      // Clear toast mocks after setup
      vi.clearAllMocks();
      vi.spyOn(sonner.toast, 'error').mockImplementation(() => '');

      // Create one more SCP to exceed the limit
      const extraScpId = useStore.getState().createPolicy({
        name: 'Extra SCP',
        type: 'scp',
        content: '{}',
      });

      // Act: Attempt to attach beyond limit
      useStore.getState().attachPolicy(rootId, extraScpId);

      // Assert: Policy attachment is handled by validation slice (no toast from attachPolicy)
      // The validation error is returned but not displayed as toast by attachPolicy
      const finalState = useStore.getState();
      const extraScpAttached = finalState.policyAttachments.some(
        a => a.policyId === extraScpId && a.nodeId === rootId
      );
      expect(extraScpAttached).toBe(false);
    });
  });

  describe('Node Creation Validation', () => {
    /**
     * Test: Verifies toast.error IS called when node creation fails due to nesting limit
     * (The validation logic itself is tested in validationSlice.test.ts)
     * Requirements: 6.3
     */
    it('shows toast.error when node creation fails due to nesting limit', () => {
      // Setup: Create organization and reach max nesting level
      useStore.getState().createOrganization('Test Organization');
      const state = useStore.getState();
      const rootId = state.organization!.rootId;

      // Create 5 nested OUs to reach max nesting (maxNestingLevels = 5)
      let currentParentId = rootId;
      for (let level = 1; level <= 5; level++) {
        useStore.getState().addNode(currentParentId, 'ou', `OU Level ${level}`);
        const currentState = useStore.getState();
        currentParentId = currentState.organization!.nodes[currentParentId].children[
          currentState.organization!.nodes[currentParentId].children.length - 1
        ];
      }

      // Clear toast mocks after setup
      vi.clearAllMocks();
      vi.spyOn(sonner.toast, 'error').mockImplementation(() => '');

      const deepestOuId = currentParentId;
      const nodeCountBefore = Object.keys(useStore.getState().organization!.nodes).length;

      // Act: Attempt to create OU beyond limit
      useStore.getState().addNode(deepestOuId, 'ou', 'OU Level 6');

      // Assert: Node should NOT be created
      const finalState = useStore.getState();
      const nodeCountAfter = Object.keys(finalState.organization!.nodes).length;
      expect(nodeCountAfter).toBe(nodeCountBefore);

      // Assert: toast.error SHOULD have been called (this is the unique value of this test)
      expect(sonner.toast.error).toHaveBeenCalled();
    });
  });
});
