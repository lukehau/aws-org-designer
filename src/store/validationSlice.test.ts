import { describe, it, expect, beforeEach } from 'vitest'
import { createTestStore } from './testHelpers'
import { ValidationErrorType } from '../types/validation'

describe('validationSlice', () => {
  let useStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    useStore = createTestStore()
  })

  describe('validateNodeCreation', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns valid when creating OU within nesting limits', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      const result = useStore.getState().validateNodeCreation(rootId, 'ou')

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns valid when creating account at any nesting level', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      const result = useStore.getState().validateNodeCreation(rootId, 'account')

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('enforces nesting limits for OUs', () => {
      // Arrange - Create nested OUs up to the limit
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const maxNesting = state.organization!.limits.maxNestingLevels

      // Create OUs up to max nesting level
      let currentParentId = rootId
      for (let i = 0; i < maxNesting; i++) {
        useStore.getState().addNode(currentParentId, 'ou', `OU Level ${i + 1}`)
        const currentState = useStore.getState()
        const parentNode = currentState.organization!.nodes[currentParentId]
        currentParentId = parentNode.children[parentNode.children.length - 1]
      }

      // Act - Try to create one more OU beyond the limit
      const result = useStore.getState().validateNodeCreation(currentParentId, 'ou')

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === ValidationErrorType.NESTING_LIMIT_EXCEEDED)).toBe(true)
    })

    it('returns invalid when no organization exists', () => {
      // Arrange - Create store without organization
      const emptyStore = createTestStore()

      // Act
      const result = emptyStore.getState().validateNodeCreation('some-id', 'ou')

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validatePolicyAttachment', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns valid when attaching policy within limits', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const policyId = useStore.getState().createPolicy({
        name: 'Test SCP',
        type: 'scp',
        content: '{"Version": "2012-10-17", "Statement": []}',
      })

      // Act
      const result = useStore.getState().validatePolicyAttachment(rootId, policyId)

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns invalid when policy is already attached', () => {
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
      const result = useStore.getState().validatePolicyAttachment(rootId, policyId)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === ValidationErrorType.POLICY_LIMIT_EXCEEDED)).toBe(true)
    })

    it('returns invalid when policy does not exist', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      const result = useStore.getState().validatePolicyAttachment(rootId, 'non-existent-policy')

      // Assert
      expect(result.isValid).toBe(false)
    })

    it('enforces SCP limit per node', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const maxSCPs = state.organization!.limits.maxSCPsPerNode

      // Attach SCPs up to the limit (accounting for default SCP)
      const attachedCount = useStore.getState().getNodeAttachedPolicies(rootId, 'scp').length
      for (let i = attachedCount; i < maxSCPs; i++) {
        const policyId = useStore.getState().createPolicy({
          name: `SCP ${i + 1}`,
          type: 'scp',
          content: '{}',
        })
        useStore.getState().attachPolicy(rootId, policyId)
      }

      // Create one more policy
      const extraPolicyId = useStore.getState().createPolicy({
        name: 'Extra SCP',
        type: 'scp',
        content: '{}',
      })

      // Act
      const result = useStore.getState().validatePolicyAttachment(rootId, extraPolicyId)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === ValidationErrorType.POLICY_LIMIT_EXCEEDED)).toBe(true)
    })
  })

  describe('validatePolicyDetachment', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns valid when detaching non-default policy', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'ou', 'Test OU')
      const afterAdd = useStore.getState()
      const ouId = afterAdd.organization!.nodes[rootId].children[0]

      const policyId = useStore.getState().createPolicy({
        name: 'Custom SCP',
        type: 'scp',
        content: '{}',
      })
      useStore.getState().attachPolicy(ouId, policyId)

      // Act
      const result = useStore.getState().validatePolicyDetachment(ouId, policyId)

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('protects default SCP from detachment on root', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const defaultScpId = 'default-scp-full-access'

      // Act
      const result = useStore.getState().validatePolicyDetachment(rootId, defaultScpId)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === ValidationErrorType.DEFAULT_POLICY_PROTECTION)).toBe(true)
    })

    it('protects default RCP from detachment on root', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const defaultRcpId = 'default-rcp-full-access'

      // Act
      const result = useStore.getState().validatePolicyDetachment(rootId, defaultRcpId)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === ValidationErrorType.DEFAULT_POLICY_PROTECTION)).toBe(true)
    })

    it('returns invalid when policy is not attached', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      const policyId = useStore.getState().createPolicy({
        name: 'Unattached SCP',
        type: 'scp',
        content: '{}',
      })

      // Act
      const result = useStore.getState().validatePolicyDetachment(rootId, policyId)

      // Assert
      expect(result.isValid).toBe(false)
    })
  })

  describe('validatePolicyName', () => {
    it('returns valid for unique policy name', () => {
      // Arrange
      useStore.getState().createPolicy({
        name: 'Existing SCP',
        type: 'scp',
        content: '{}',
      })

      // Act
      const result = useStore.getState().validatePolicyName('New SCP', 'scp')

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns invalid for duplicate policy name within same type', () => {
      // Arrange
      useStore.getState().createPolicy({
        name: 'My Policy',
        type: 'scp',
        content: '{}',
      })

      // Act
      const result = useStore.getState().validatePolicyName('My Policy', 'scp')

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === ValidationErrorType.DUPLICATE_POLICY_NAME)).toBe(true)
    })

    it('returns invalid for empty policy name', () => {
      // Act
      const result = useStore.getState().validatePolicyName('', 'scp')

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === ValidationErrorType.DUPLICATE_POLICY_NAME)).toBe(true)
    })

    it('returns invalid for whitespace-only policy name', () => {
      // Act
      const result = useStore.getState().validatePolicyName('   ', 'scp')

      // Assert
      expect(result.isValid).toBe(false)
    })

    it('allows same name for different policy types', () => {
      // Arrange
      useStore.getState().createPolicy({
        name: 'Shared Name',
        type: 'scp',
        content: '{}',
      })

      // Act
      const result = useStore.getState().validatePolicyName('Shared Name', 'rcp')

      // Assert
      expect(result.isValid).toBe(true)
    })

    it('allows keeping same name when editing existing policy', () => {
      // Arrange
      const policyId = useStore.getState().createPolicy({
        name: 'My Policy',
        type: 'scp',
        content: '{}',
      })

      // Act - Check same name but exclude the policy itself (for editing)
      const result = useStore.getState().validatePolicyName('My Policy', 'scp', policyId)

      // Assert
      expect(result.isValid).toBe(true)
    })
  })

  describe('error management', () => {
    it('can add a validation error', () => {
      // Arrange
      const error = {
        type: ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED,
        message: 'Test error',
      }

      // Act
      useStore.getState().addValidationError(error)

      // Assert
      const errors = useStore.getState().validationErrors
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe(ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED)
    })

    it('can clear all validation errors', () => {
      // Arrange
      useStore.getState().addValidationError({
        type: ValidationErrorType.ACCOUNT_LIMIT_EXCEEDED,
        message: 'Error 1',
      })
      useStore.getState().addValidationError({
        type: ValidationErrorType.OU_LIMIT_EXCEEDED,
        message: 'Error 2',
      })

      // Act
      useStore.getState().clearValidationErrors()

      // Assert
      expect(useStore.getState().validationErrors).toHaveLength(0)
    })
  })
})
