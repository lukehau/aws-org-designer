import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { createTestStore } from './testHelpers'

describe('policySlice', () => {
  let useStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    useStore = createTestStore()
  })

  describe('createPolicy', () => {
    it('generates unique IDs for each policy', () => {
      // Arrange & Act
      const policyId1 = useStore.getState().createPolicy({
        name: 'Policy 1',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
        description: 'Test policy 1',
      })

      const policyId2 = useStore.getState().createPolicy({
        name: 'Policy 2',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
        description: 'Test policy 2',
      })

      // Assert
      expect(policyId1).toBeDefined()
      expect(policyId2).toBeDefined()
      expect(policyId1).not.toBe(policyId2)
    })

    it('sets createdAt and lastModified timestamps', () => {
      // Arrange
      const beforeCreate = new Date()

      // Act
      const policyId = useStore.getState().createPolicy({
        name: 'Test Policy',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })

      const afterCreate = new Date()

      // Assert
      const policy = useStore.getState().getPolicy(policyId)
      expect(policy).not.toBeNull()
      expect(policy!.createdAt).toBeInstanceOf(Date)
      expect(policy!.lastModified).toBeInstanceOf(Date)
      expect(policy!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(policy!.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })

    it('stores policy with correct properties', () => {
      // Arrange & Act
      const policyId = useStore.getState().createPolicy({
        name: 'My SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
        description: 'A test SCP',
      })

      // Assert
      const policy = useStore.getState().getPolicy(policyId)
      expect(policy).not.toBeNull()
      expect(policy!.name).toBe('My SCP')
      expect(policy!.type).toBe('scp')
      expect(policy!.content).toBe('{"Version": "2012-10-17", "Statement": []}')
      expect(policy!.description).toBe('A test SCP')
    })

    it('creates RCP policies correctly', () => {
      // Arrange & Act
      const policyId = useStore.getState().createPolicy({
        name: 'My RCP',
        type: 'rcp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })

      // Assert
      const policy = useStore.getState().getPolicy(policyId)
      expect(policy).not.toBeNull()
      expect(policy!.type).toBe('rcp')
    })
  })

  describe('attachPolicy', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('links policy to node when attached', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const policyId = useStore.getState().createPolicy({
        name: 'Custom SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })

      // Act
      useStore.getState().attachPolicy(rootId, policyId)

      // Assert
      const updatedState = useStore.getState()
      const isAttached = updatedState.isPolicyAttachedToNode(rootId, policyId)
      expect(isAttached).toBe(true)
    })

    it('does not create duplicate attachments', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const policyId = useStore.getState().createPolicy({
        name: 'Custom SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })

      // Act - Attach twice
      useStore.getState().attachPolicy(rootId, policyId)
      const attachmentsAfterFirst = useStore.getState().policyAttachments.filter(
        a => a.nodeId === rootId && a.policyId === policyId
      ).length

      useStore.getState().attachPolicy(rootId, policyId)
      const attachmentsAfterSecond = useStore.getState().policyAttachments.filter(
        a => a.nodeId === rootId && a.policyId === policyId
      ).length

      // Assert
      expect(attachmentsAfterFirst).toBe(1)
      expect(attachmentsAfterSecond).toBe(1)
    })

    it('attaches policy to OU node', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterAdd = useStore.getState()
      const ouId = afterAdd.organization!.nodes[rootId].children[0]

      const policyId = useStore.getState().createPolicy({
        name: 'Dev SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })

      // Act
      useStore.getState().attachPolicy(ouId, policyId)

      // Assert
      const isAttached = useStore.getState().isPolicyAttachedToNode(ouId, policyId)
      expect(isAttached).toBe(true)
    })
  })

  describe('detachPolicy', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('unlinks policy from node when detached', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterAdd = useStore.getState()
      const ouId = afterAdd.organization!.nodes[rootId].children[0]

      const policyId = useStore.getState().createPolicy({
        name: 'Custom SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })

      useStore.getState().attachPolicy(ouId, policyId)
      expect(useStore.getState().isPolicyAttachedToNode(ouId, policyId)).toBe(true)

      // Act
      useStore.getState().detachPolicy(ouId, policyId)

      // Assert
      expect(useStore.getState().isPolicyAttachedToNode(ouId, policyId)).toBe(false)
    })

    it('does not allow detaching default policies from root', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const defaultScpId = 'default-scp-full-access'

      // Verify default policy is attached
      expect(useStore.getState().isPolicyAttachedToNode(rootId, defaultScpId)).toBe(true)

      // Act
      useStore.getState().detachPolicy(rootId, defaultScpId)

      // Assert - Should still be attached (protected)
      expect(useStore.getState().isPolicyAttachedToNode(rootId, defaultScpId)).toBe(true)
    })
  })

  describe('getNodeInheritedPolicies', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns policies directly attached to a node', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const policyId = useStore.getState().createPolicy({
        name: 'Custom SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })
      useStore.getState().attachPolicy(rootId, policyId)

      // Act
      const inherited = useStore.getState().getNodeInheritedPolicies(rootId)

      // Assert
      expect(inherited.nodeId).toBe(rootId)
      // Should include the custom policy plus default policies
      expect(inherited.directPolicies.scps.some(p => p.id === policyId)).toBe(true)
    })

    it('calculates inherited policies from parent nodes', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Create OU under root
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterOuAdd = useStore.getState()
      const ouId = afterOuAdd.organization!.nodes[rootId].children[0]

      // Create account under OU
      useStore.getState().addNode(ouId, 'account', 'Dev Account')
      const afterAccountAdd = useStore.getState()
      const accountId = afterAccountAdd.organization!.nodes[ouId].children[0]

      // Attach policy to OU
      const policyId = useStore.getState().createPolicy({
        name: 'Dev SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })
      useStore.getState().attachPolicy(ouId, policyId)

      // Act
      const inherited = useStore.getState().getNodeInheritedPolicies(accountId)

      // Assert
      expect(inherited.nodeId).toBe(accountId)
      // Account should inherit the policy from OU
      expect(inherited.inheritedPolicies.scps.some(p => p.policy.id === policyId)).toBe(true)
      // The inherited policy should reference the OU as source
      const inheritedPolicy = inherited.inheritedPolicies.scps.find(p => p.policy.id === policyId)
      expect(inheritedPolicy?.inheritedFrom).toBe(ouId)
    })

    it('combines directly attached and inherited policies', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Create OU under root
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterOuAdd = useStore.getState()
      const ouId = afterOuAdd.organization!.nodes[rootId].children[0]

      // Attach policy to root (will be inherited by OU)
      const rootPolicyId = useStore.getState().createPolicy({
        name: 'Root SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })
      useStore.getState().attachPolicy(rootId, rootPolicyId)

      // Attach policy directly to OU
      const ouPolicyId = useStore.getState().createPolicy({
        name: 'OU SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })
      useStore.getState().attachPolicy(ouId, ouPolicyId)

      // Act
      const inherited = useStore.getState().getNodeInheritedPolicies(ouId)

      // Assert
      // Effective policies should include both direct and inherited
      expect(inherited.effectivePolicies.scps.some(p => p.id === ouPolicyId)).toBe(true)
      expect(inherited.effectivePolicies.scps.some(p => p.id === rootPolicyId)).toBe(true)
    })
  })

  describe('isPolicyAttachedToNode', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns true when policy is attached', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const policyId = useStore.getState().createPolicy({
        name: 'Test SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })
      useStore.getState().attachPolicy(rootId, policyId)

      // Act
      const isAttached = useStore.getState().isPolicyAttachedToNode(rootId, policyId)

      // Assert
      expect(isAttached).toBe(true)
    })

    it('returns false when policy is not attached', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const policyId = useStore.getState().createPolicy({
        name: 'Test SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })
      // Don't attach the policy

      // Act
      const isAttached = useStore.getState().isPolicyAttachedToNode(rootId, policyId)

      // Assert
      expect(isAttached).toBe(false)
    })

    it('returns false for non-existent node', () => {
      // Arrange
      const policyId = useStore.getState().createPolicy({
        name: 'Test SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })

      // Act
      const isAttached = useStore.getState().isPolicyAttachedToNode('non-existent-node', policyId)

      // Assert
      expect(isAttached).toBe(false)
    })

    it('returns false for non-existent policy', () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      const isAttached = useStore.getState().isPolicyAttachedToNode(rootId, 'non-existent-policy')

      // Assert
      expect(isAttached).toBe(false)
    })
  })

  describe('getPoliciesByType', () => {
    it('returns only SCP policies when type is scp', () => {
      // Arrange
      useStore.getState().createPolicy({
        name: 'SCP 1',
        type: 'scp',
        content: '{}',
      })
      useStore.getState().createPolicy({
        name: 'RCP 1',
        type: 'rcp',
        content: '{}',
      })
      useStore.getState().createPolicy({
        name: 'SCP 2',
        type: 'scp',
        content: '{}',
      })

      // Act
      const scps = useStore.getState().getPoliciesByType('scp')

      // Assert
      expect(scps.length).toBe(2)
      expect(scps.every(p => p.type === 'scp')).toBe(true)
    })

    it('returns only RCP policies when type is rcp', () => {
      // Arrange
      useStore.getState().createPolicy({
        name: 'SCP 1',
        type: 'scp',
        content: '{}',
      })
      useStore.getState().createPolicy({
        name: 'RCP 1',
        type: 'rcp',
        content: '{}',
      })

      // Act
      const rcps = useStore.getState().getPoliciesByType('rcp')

      // Assert
      expect(rcps.length).toBe(1)
      expect(rcps.every(p => p.type === 'rcp')).toBe(true)
    })
  })

  describe('getNodeAttachedPolicies', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns all attached policies for a node', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      const scpId = useStore.getState().createPolicy({
        name: 'Custom SCP',
        type: 'scp',
        content: '{}',
      })
      const rcpId = useStore.getState().createPolicy({
        name: 'Custom RCP',
        type: 'rcp',
        content: '{}',
      })

      useStore.getState().attachPolicy(rootId, scpId)
      useStore.getState().attachPolicy(rootId, rcpId)

      // Act
      const attachedPolicies = useStore.getState().getNodeAttachedPolicies(rootId)

      // Assert - Should include default policies plus custom ones
      expect(attachedPolicies.some(p => p.id === scpId)).toBe(true)
      expect(attachedPolicies.some(p => p.id === rcpId)).toBe(true)
    })

    it('filters by type when type parameter is provided', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      const scpId = useStore.getState().createPolicy({
        name: 'Custom SCP',
        type: 'scp',
        content: '{}',
      })
      const rcpId = useStore.getState().createPolicy({
        name: 'Custom RCP',
        type: 'rcp',
        content: '{}',
      })

      useStore.getState().attachPolicy(rootId, scpId)
      useStore.getState().attachPolicy(rootId, rcpId)

      // Act
      const scps = useStore.getState().getNodeAttachedPolicies(rootId, 'scp')
      const rcps = useStore.getState().getNodeAttachedPolicies(rootId, 'rcp')

      // Assert
      expect(scps.every(p => p.type === 'scp')).toBe(true)
      expect(rcps.every(p => p.type === 'rcp')).toBe(true)
    })
  })
})


describe('policySlice property-based tests', () => {
  // Arbitrary for generating valid policy names
  const policyNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0)

  // Arbitrary for policy types
  const policyTypeArb = fc.constantFrom('scp' as const, 'rcp' as const)

  // Arbitrary for valid JSON policy content
  const policyContentArb = fc.constant('{"Version": "2012-10-17", "Statement": []}')

  /**
   * Property 5: Attaching the Same Policy Twice Creates Only One Attachment
   * For any node and policy, attaching the same policy twice SHALL result in
   * only one attachment (no duplicates).
   * **Validates: Requirements 6.2**
   */
  it('attaching the same policy twice only creates one link', () => {
    fc.assert(
      fc.property(
        policyNameArb,
        policyTypeArb,
        policyContentArb,
        (policyName, policyType, policyContent) => {
          // Create fresh store for each test
          const store = createTestStore()

          // Setup: Create organization
          store.getState().createOrganization('Test Org')
          const state = store.getState()
          const rootId = state.organization!.rootId

          // Create a policy
          const policyId = store.getState().createPolicy({
            name: policyName,
            type: policyType,
            content: policyContent,
          })

          // Act: Attach the same policy twice
          store.getState().attachPolicy(rootId, policyId)
          const attachmentsAfterFirst = store.getState().policyAttachments.filter(
            a => a.nodeId === rootId && a.policyId === policyId
          ).length

          store.getState().attachPolicy(rootId, policyId)
          const attachmentsAfterSecond = store.getState().policyAttachments.filter(
            a => a.nodeId === rootId && a.policyId === policyId
          ).length

          // Assert: Should have exactly one attachment after both attempts
          if (attachmentsAfterFirst !== 1) return false
          if (attachmentsAfterSecond !== 1) return false

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
