import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { createTestStore } from './testHelpers'

describe('organizationSlice', () => {
  let useStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    useStore = createTestStore()
  })

  describe('createOrganization', () => {
    it('creates organization with name and root node', () => {
      // Arrange & Act
      useStore.getState().createOrganization('Test Org')

      // Assert
      const state = useStore.getState()
      expect(state.organization).not.toBeNull()
      expect(state.organization?.name).toBe('Test Org')
      expect(state.organization?.rootId).toBeDefined()
    })

    it('root node is properly initialized with no parent and no children', () => {
      // Arrange & Act
      useStore.getState().createOrganization('My Organization')

      // Assert
      const state = useStore.getState()
      const rootId = state.organization?.rootId
      expect(rootId).toBeDefined()

      const rootNode = state.organization?.nodes[rootId!]
      expect(rootNode).toBeDefined()
      expect(rootNode?.type).toBe('root')
      expect(rootNode?.parentId).toBeNull()
      expect(rootNode?.children).toEqual([])
      expect(rootNode?.name).toBe('My Organization')
    })

    it('automatically selects the root node after creating organization', () => {
      // Arrange & Act
      useStore.getState().createOrganization('Test Org')

      // Assert
      const state = useStore.getState()
      expect(state.selectedNodeId).toBe(state.organization?.rootId)
    })

    it('creates default policies attached to root', () => {
      // Arrange & Act
      useStore.getState().createOrganization('Test Org')

      // Assert
      const state = useStore.getState()
      expect(state.policies['default-scp-full-access']).toBeDefined()
      expect(state.policies['default-rcp-full-access']).toBeDefined()
      expect(state.policyAttachments.length).toBe(2)
    })
  })

  describe('addNode', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('adds OU node to correct parent', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      useStore.getState().addNode(rootId, 'ou', 'Development')

      // Assert
      const updatedState = useStore.getState()
      const rootNode = updatedState.organization!.nodes[rootId]
      expect(rootNode.children.length).toBe(1)

      const childId = rootNode.children[0]
      const childNode = updatedState.organization!.nodes[childId]
      expect(childNode.name).toBe('Development')
      expect(childNode.type).toBe('ou')
      expect(childNode.parentId).toBe(rootId)
    })

    it('adds account node to correct parent', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      useStore.getState().addNode(rootId, 'account', 'Production Account')

      // Assert
      const updatedState = useStore.getState()
      const rootNode = updatedState.organization!.nodes[rootId]
      expect(rootNode.children.length).toBe(1)

      const childId = rootNode.children[0]
      const childNode = updatedState.organization!.nodes[childId]
      expect(childNode.name).toBe('Production Account')
      expect(childNode.type).toBe('account')
      expect(childNode.parentId).toBe(rootId)
    })

    it('adds multiple children to same parent', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      useStore.getState().addNode(rootId, 'ou', 'Development')
      useStore.getState().addNode(rootId, 'ou', 'Production')
      useStore.getState().addNode(rootId, 'account', 'Shared Services')

      // Assert
      const updatedState = useStore.getState()
      const rootNode = updatedState.organization!.nodes[rootId]
      expect(rootNode.children.length).toBe(3)
    })

    it('adds nested nodes correctly', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act - Create OU under root, then account under OU
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterFirstAdd = useStore.getState()
      const ouId = afterFirstAdd.organization!.nodes[rootId].children[0]

      useStore.getState().addNode(ouId, 'account', 'Dev Account')

      // Assert
      const updatedState = useStore.getState()
      const ouNode = updatedState.organization!.nodes[ouId]
      expect(ouNode.children.length).toBe(1)

      const accountId = ouNode.children[0]
      const accountNode = updatedState.organization!.nodes[accountId]
      expect(accountNode.name).toBe('Dev Account')
      expect(accountNode.parentId).toBe(ouId)
    })

    it('creates node with position data', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      useStore.getState().addNode(rootId, 'ou', 'Development')

      // Assert
      const updatedState = useStore.getState()
      const childId = updatedState.organization!.nodes[rootId].children[0]
      const childNode = updatedState.organization!.nodes[childId]
      expect(childNode.position).toBeDefined()
      expect(typeof childNode.position.x).toBe('number')
      expect(typeof childNode.position.y).toBe('number')
    })

    it('creates node with metadata', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      useStore.getState().addNode(rootId, 'ou', 'Development')

      // Assert
      const updatedState = useStore.getState()
      const childId = updatedState.organization!.nodes[rootId].children[0]
      const childNode = updatedState.organization!.nodes[childId]
      expect(childNode.metadata).toBeDefined()
      expect(childNode.metadata.createdAt).toBeInstanceOf(Date)
      expect(childNode.metadata.lastModified).toBeInstanceOf(Date)
    })
  })

  describe('deleteNode', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('removes node and updates parent children array', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterAdd = useStore.getState()
      const ouId = afterAdd.organization!.nodes[rootId].children[0]

      // Act
      useStore.getState().deleteNode(ouId)

      // Assert
      const updatedState = useStore.getState()
      expect(updatedState.organization!.nodes[ouId]).toBeUndefined()
      expect(updatedState.organization!.nodes[rootId].children).not.toContain(ouId)
      expect(updatedState.organization!.nodes[rootId].children.length).toBe(0)
    })

    it('removes node and all its children recursively', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Create nested structure: root -> OU -> Account
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterOuAdd = useStore.getState()
      const ouId = afterOuAdd.organization!.nodes[rootId].children[0]

      useStore.getState().addNode(ouId, 'account', 'Dev Account')
      const afterAccountAdd = useStore.getState()
      const accountId = afterAccountAdd.organization!.nodes[ouId].children[0]

      // Act - Delete the OU (should also delete the account)
      useStore.getState().deleteNode(ouId)

      // Assert
      const updatedState = useStore.getState()
      expect(updatedState.organization!.nodes[ouId]).toBeUndefined()
      expect(updatedState.organization!.nodes[accountId]).toBeUndefined()
      expect(updatedState.organization!.nodes[rootId].children.length).toBe(0)
    })

    it('does not delete root node', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      useStore.getState().deleteNode(rootId)

      // Assert
      const updatedState = useStore.getState()
      expect(updatedState.organization!.nodes[rootId]).toBeDefined()
    })

    it('deselects node when it gets deleted', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterAdd = useStore.getState()
      const ouId = afterAdd.organization!.nodes[rootId].children[0]
      useStore.getState().selectNode(ouId)

      // Act
      useStore.getState().deleteNode(ouId)

      // Assert
      const updatedState = useStore.getState()
      expect(updatedState.selectedNodeId).toBeNull()
    })
  })

  describe('getNodePath', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns only the root when getting path for root node', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      const path = useStore.getState().getNodePath(rootId)

      // Assert
      expect(path.length).toBe(1)
      expect(path[0].id).toBe(rootId)
    })

    it('returns complete ancestry path for nested nodes', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Create nested structure: root -> OU -> Account
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterOuAdd = useStore.getState()
      const ouId = afterOuAdd.organization!.nodes[rootId].children[0]

      useStore.getState().addNode(ouId, 'account', 'Dev Account')
      const afterAccountAdd = useStore.getState()
      const accountId = afterAccountAdd.organization!.nodes[ouId].children[0]

      // Act
      const path = useStore.getState().getNodePath(accountId)

      // Assert
      expect(path.length).toBe(3)
      expect(path[0].id).toBe(rootId)
      expect(path[1].id).toBe(ouId)
      expect(path[2].id).toBe(accountId)
    })

    it('returns empty array for non-existent node', () => {
      // Act
      const path = useStore.getState().getNodePath('non-existent-id')

      // Assert
      expect(path).toEqual([])
    })
  })

  describe('getNestingLevel', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns depth 0 for root node', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      const level = useStore.getState().getNestingLevel(rootId)

      // Assert
      expect(level).toBe(0)
    })

    it('returns depth 1 for direct children of root', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterAdd = useStore.getState()
      const ouId = afterAdd.organization!.nodes[rootId].children[0]

      // Act
      const level = useStore.getState().getNestingLevel(ouId)

      // Assert
      expect(level).toBe(1)
    })

    it('returns correct level for deeply nested nodes', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Create nested structure: root -> OU1 -> OU2 -> Account
      useStore.getState().addNode(rootId, 'ou', 'Level 1')
      let currentState = useStore.getState()
      const ou1Id = currentState.organization!.nodes[rootId].children[0]

      useStore.getState().addNode(ou1Id, 'ou', 'Level 2')
      currentState = useStore.getState()
      const ou2Id = currentState.organization!.nodes[ou1Id].children[0]

      useStore.getState().addNode(ou2Id, 'account', 'Level 3 Account')
      currentState = useStore.getState()
      const accountId = currentState.organization!.nodes[ou2Id].children[0]

      // Act & Assert
      expect(useStore.getState().getNestingLevel(ou1Id)).toBe(1)
      expect(useStore.getState().getNestingLevel(ou2Id)).toBe(2)
      expect(useStore.getState().getNestingLevel(accountId)).toBe(3)
    })
  })

  describe('getNode', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns node for valid id', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      const node = useStore.getState().getNode(rootId)

      // Assert
      expect(node).not.toBeNull()
      expect(node?.id).toBe(rootId)
    })

    it('returns null for non-existent id', () => {
      // Act
      const node = useStore.getState().getNode('non-existent-id')

      // Assert
      expect(node).toBeNull()
    })
  })

  describe('getNodeChildren', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns empty array for node with no children', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId

      // Act
      const children = useStore.getState().getNodeChildren(rootId)

      // Assert
      expect(children).toEqual([])
    })

    it('returns all children for node with children', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'ou', 'OU 1')
      useStore.getState().addNode(rootId, 'ou', 'OU 2')

      // Act
      const children = useStore.getState().getNodeChildren(rootId)

      // Assert
      expect(children.length).toBe(2)
      expect(children.map(c => c.name)).toContain('OU 1')
      expect(children.map(c => c.name)).toContain('OU 2')
    })
  })

  describe('selectNode', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('sets selectedNodeId', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'ou', 'Development')
      const afterAdd = useStore.getState()
      const ouId = afterAdd.organization!.nodes[rootId].children[0]

      // Act
      useStore.getState().selectNode(ouId)

      // Assert
      expect(useStore.getState().selectedNodeId).toBe(ouId)
    })

    it('can deselect all nodes', () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')

      // Act
      useStore.getState().selectNode(null)

      // Assert
      expect(useStore.getState().selectedNodeId).toBeNull()
    })
  })

  describe('getAccountCount', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns 0 when no accounts exist', () => {
      // Act
      const count = useStore.getState().getAccountCount()

      // Assert
      expect(count).toBe(0)
    })

    it('returns correct count of accounts', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'account', 'Account 1')
      useStore.getState().addNode(rootId, 'account', 'Account 2')
      useStore.getState().addNode(rootId, 'ou', 'OU 1') // Not an account

      // Act
      const count = useStore.getState().getAccountCount()

      // Assert
      expect(count).toBe(2)
    })
  })

  describe('getOUCount', () => {
    beforeEach(() => {
      useStore.getState().createOrganization('Test Org')
    })

    it('returns 0 when no OUs exist', () => {
      // Act
      const count = useStore.getState().getOUCount()

      // Assert
      expect(count).toBe(0)
    })

    it('returns correct count of OUs', () => {
      // Arrange
      const state = useStore.getState()
      const rootId = state.organization!.rootId
      useStore.getState().addNode(rootId, 'ou', 'OU 1')
      useStore.getState().addNode(rootId, 'ou', 'OU 2')
      useStore.getState().addNode(rootId, 'account', 'Account 1') // Not an OU

      // Act
      const count = useStore.getState().getOUCount()

      // Assert
      expect(count).toBe(2)
    })
  })
})


describe('organizationSlice property-based tests', () => {
  // Arbitrary for generating valid organization names
  const orgNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0)

  // Arbitrary for generating valid node names
  const nodeNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0)

  // Arbitrary for node types (ou or account)
  const nodeTypeArb = fc.constantFrom('ou' as const, 'account' as const)

  /**
   * Property 3: Organization Creation Produces Valid Structure
   * For any valid organization name string, calling createOrganization SHALL produce
   * an organization with a root node, and the root node SHALL have no parent.
   * **Validates: Requirements 6.1, 6.7**
   */
  it('creating an organization always has a root node with no parent', () => {
    fc.assert(
      fc.property(orgNameArb, (orgName) => {
        // Create fresh store for each test
        const store = createTestStore()
        
        // Act
        store.getState().createOrganization(orgName)
        
        // Assert
        const state = store.getState()
        
        // Organization exists
        if (!state.organization) return false
        
        // Organization has a root ID
        if (!state.organization.rootId) return false
        
        // Root node exists in nodes
        const rootNode = state.organization.nodes[state.organization.rootId]
        if (!rootNode) return false
        
        // Root node has no parent
        if (rootNode.parentId !== null) return false
        
        // Root node is of type 'root'
        if (rootNode.type !== 'root') return false
        
        // Root node has empty children array initially
        if (!Array.isArray(rootNode.children)) return false
        
        // Organization name matches
        if (state.organization.name !== orgName) return false
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4: Adding a Node Updates Parent and Sets Correct parentId
   * For any valid parent node and node type, calling addNode SHALL result in the new node
   * appearing in the parent's children array, and the new node's parentId pointing back
   * to the parent.
   * **Validates: Requirements 6.1, 6.7**
   */
  it('adding a node links it to its parent correctly', () => {
    fc.assert(
      fc.property(orgNameArb, nodeNameArb, nodeTypeArb, (orgName, nodeName, nodeType) => {
        // Create fresh store for each test
        const store = createTestStore()
        
        // Setup: Create organization
        store.getState().createOrganization(orgName)
        const initialState = store.getState()
        const rootId = initialState.organization!.rootId
        const initialChildCount = initialState.organization!.nodes[rootId].children.length
        
        // Act: Add node to root
        store.getState().addNode(rootId, nodeType, nodeName)
        
        // Assert
        const state = store.getState()
        const rootNode = state.organization!.nodes[rootId]
        
        // Parent's children array should have grown by 1
        if (rootNode.children.length !== initialChildCount + 1) return false
        
        // Get the new child ID
        const newChildId = rootNode.children[rootNode.children.length - 1]
        const newChild = state.organization!.nodes[newChildId]
        
        // New node should exist
        if (!newChild) return false
        
        // New node's parentId should point to root
        if (newChild.parentId !== rootId) return false
        
        // New node should have correct type
        if (newChild.type !== nodeType) return false
        
        // New node should have correct name
        if (newChild.name !== nodeName) return false
        
        return true
      }),
      { numRuns: 100 }
    )
  })
})
