/**
 * Tests for persistenceSlice
 * 
 * Tests export, import, and localStorage operations for organization persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import * as sonner from 'sonner'
import * as persistenceModule from '../lib/persistence'
import { PersistenceManager } from '../lib/persistence'
import { createTestStore, createMinimalOrganization, resetPersistenceManager, createMockFile } from './testHelpers'
import type { PersistedState } from '../types/persistence'

// Mock PersistenceManager methods
let mockPersistenceManager: {
  exportState: ReturnType<typeof vi.fn>
  importState: ReturnType<typeof vi.fn>
  saveToLocalStorage: ReturnType<typeof vi.fn>
  loadFromLocalStorage: ReturnType<typeof vi.fn>
  clearLocalStorage: ReturnType<typeof vi.fn>
  getCurrentOrganizationVersion: ReturnType<typeof vi.fn>
  setOrganizationVersion: ReturnType<typeof vi.fn>
  loadTutorialCompleted: ReturnType<typeof vi.fn>
  saveTutorialCompleted: ReturnType<typeof vi.fn>
}

describe('persistenceSlice', () => {
  let useStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    // Reset PersistenceManager singleton
    resetPersistenceManager()
    
    // Create fresh store for each test
    useStore = createTestStore()
    
    // Set up mock PersistenceManager
    mockPersistenceManager = {
      exportState: vi.fn().mockResolvedValue(undefined),
      importState: vi.fn(),
      saveToLocalStorage: vi.fn().mockResolvedValue(undefined),
      loadFromLocalStorage: vi.fn().mockReturnValue(null),
      clearLocalStorage: vi.fn(),
      getCurrentOrganizationVersion: vi.fn().mockReturnValue('1.0'),
      setOrganizationVersion: vi.fn(),
      loadTutorialCompleted: vi.fn().mockReturnValue(false),
      saveTutorialCompleted: vi.fn(),
    }
    
    // Spy on getPersistenceManager to return our mock
    vi.spyOn(persistenceModule, 'getPersistenceManager').mockReturnValue(
      mockPersistenceManager as unknown as PersistenceManager
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('exportOrganization', () => {
    it('exports organization successfully with valid data', async () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      
      // Act
      await useStore.getState().exportOrganization()
      
      // Assert
      expect(mockPersistenceManager.exportState).toHaveBeenCalledTimes(1)
      expect(mockPersistenceManager.exportState).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Org' }),
        expect.any(Object),
        expect.any(Array),
        undefined
      )
    })

    it('throws error when no organization exists', async () => {
      // Arrange - no organization created
      
      // Act & Assert
      await expect(useStore.getState().exportOrganization()).rejects.toThrow('No organization to export')
    })

    it('shows success toast notification on successful export', async () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      
      // Act
      await useStore.getState().exportOrganization()
      
      // Assert
      expect(sonner.toast.success).toHaveBeenCalledWith(
        'Export Successful',
        expect.objectContaining({
          description: expect.stringContaining('Test Org')
        })
      )
    })

    it('shows error toast and sets saveError state on failure', async () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      mockPersistenceManager.exportState.mockRejectedValue(new Error('Export failed'))
      
      // Act & Assert
      await expect(useStore.getState().exportOrganization()).rejects.toThrow('Export failed')
      
      expect(sonner.toast.error).toHaveBeenCalledWith(
        'Export Failed',
        expect.objectContaining({
          description: expect.stringContaining('Export failed')
        })
      )
      expect(useStore.getState().saveError).toBe('Failed to export organization')
    })

    it('sets isSaving state to true during operation and false after', async () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      let savingDuringExport = false
      
      mockPersistenceManager.exportState.mockImplementation(async () => {
        savingDuringExport = useStore.getState().isSaving
      })
      
      // Act
      await useStore.getState().exportOrganization()
      
      // Assert
      expect(savingDuringExport).toBe(true)
      expect(useStore.getState().isSaving).toBe(false)
    })

    it('uses custom filename when provided', async () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      
      // Act
      await useStore.getState().exportOrganization('custom-filename.json')
      
      // Assert
      expect(mockPersistenceManager.exportState).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Array),
        'custom-filename.json'
      )
    })
  })

  describe('importOrganization', () => {
    const createValidPersistedState = (): PersistedState => ({
      version: '1.0.0',
      organization: createMinimalOrganization(),
      policies: {
        'default-scp-full-access': {
          id: 'default-scp-full-access',
          name: 'FullAWSAccess',
          type: 'scp',
          content: '{}',
          createdAt: new Date(),
          lastModified: new Date(),
        },
        'default-rcp-full-access': {
          id: 'default-rcp-full-access',
          name: 'RCPFullAWSAccess',
          type: 'rcp',
          content: '{}',
          createdAt: new Date(),
          lastModified: new Date(),
        },
      },
      policyAttachments: [
        { policyId: 'default-scp-full-access', nodeId: 'root-1', attachedAt: new Date() },
        { policyId: 'default-rcp-full-access', nodeId: 'root-1', attachedAt: new Date() },
      ],
      metadata: {
        lastSaved: new Date(),
        appVersion: '0.0.0',
        organizationVersion: '1.0',
      },
    })

    it('imports organization successfully with valid file', async () => {
      // Arrange
      const validState = createValidPersistedState()
      mockPersistenceManager.importState.mockResolvedValue(validState)
      const file = createMockFile(JSON.stringify(validState))
      
      // Act
      const importPromise = useStore.getState().importOrganization(file)
      await vi.advanceTimersByTimeAsync(1000)
      const result = await importPromise
      
      // Assert
      expect(result).toBe(true)
      expect(useStore.getState().organization).not.toBeNull()
      expect(useStore.getState().organization?.name).toBe('Test Organization')
    })

    it('rejects invalid JSON with error message', async () => {
      // Arrange
      mockPersistenceManager.importState.mockRejectedValue(
        new Error('Failed to parse organization file: Invalid JSON')
      )
      const file = createMockFile('invalid json')
      
      // Act
      const importPromise = useStore.getState().importOrganization(file)
      await vi.advanceTimersByTimeAsync(1000)
      const result = await importPromise
      
      // Assert
      expect(result).toBe(false)
      expect(useStore.getState().saveError).toContain('Failed to import organization')
    })

    it('rejects file missing required fields', async () => {
      // Arrange
      mockPersistenceManager.importState.mockRejectedValue(
        new Error('Invalid organization file format - missing required fields')
      )
      const file = createMockFile(JSON.stringify({ incomplete: true }))
      
      // Act
      const importPromise = useStore.getState().importOrganization(file)
      await vi.advanceTimersByTimeAsync(1000)
      const result = await importPromise
      
      // Assert
      expect(result).toBe(false)
      expect(useStore.getState().saveError).toContain('missing required fields')
    })

    it('creates default policies when missing from imported data', async () => {
      // Arrange
      const stateWithoutDefaults: PersistedState = {
        version: '1.0.0',
        organization: createMinimalOrganization(),
        policies: {},
        policyAttachments: [],
        metadata: {
          lastSaved: new Date(),
          appVersion: '0.0.0',
          organizationVersion: '1.0',
        },
      }
      mockPersistenceManager.importState.mockResolvedValue(stateWithoutDefaults)
      const file = createMockFile(JSON.stringify(stateWithoutDefaults))
      
      // Act
      const importPromise = useStore.getState().importOrganization(file)
      await vi.advanceTimersByTimeAsync(1000)
      await importPromise
      
      // Assert
      const state = useStore.getState()
      expect(state.policies['default-scp-full-access']).toBeDefined()
      expect(state.policies['default-rcp-full-access']).toBeDefined()
      expect(state.policyAttachments.some(a => a.policyId === 'default-scp-full-access')).toBe(true)
      expect(state.policyAttachments.some(a => a.policyId === 'default-rcp-full-access')).toBe(true)
    })

    it('calls refreshAllNodesPolicyData after successful import', async () => {
      // Arrange
      const validState = createValidPersistedState()
      mockPersistenceManager.importState.mockResolvedValue(validState)
      const file = createMockFile(JSON.stringify(validState))
      const refreshSpy = vi.spyOn(useStore.getState(), 'refreshAllNodesPolicyData')
      
      // Act
      const importPromise = useStore.getState().importOrganization(file)
      await vi.advanceTimersByTimeAsync(1000)
      await importPromise
      
      // Assert
      expect(refreshSpy).toHaveBeenCalled()
    })

    it('shows toast notification when silent=false', async () => {
      // Arrange
      const validState = createValidPersistedState()
      mockPersistenceManager.importState.mockResolvedValue(validState)
      const file = createMockFile(JSON.stringify(validState))
      
      // Act
      const importPromise = useStore.getState().importOrganization(file, false)
      await vi.advanceTimersByTimeAsync(1000)
      await importPromise
      
      // Assert
      expect(sonner.toast.success).toHaveBeenCalledWith(
        'Import Successful',
        expect.any(Object)
      )
    })

    it('does not show toast notification when silent=true', async () => {
      // Arrange
      const validState = createValidPersistedState()
      mockPersistenceManager.importState.mockResolvedValue(validState)
      const file = createMockFile(JSON.stringify(validState))
      
      // Clear any previous toast calls
      vi.clearAllMocks()
      
      // Re-setup the mock after clearing
      vi.spyOn(persistenceModule, 'getPersistenceManager').mockReturnValue(
        mockPersistenceManager as unknown as PersistenceManager
      )
      mockPersistenceManager.importState.mockResolvedValue(validState)
      
      // Act
      const importPromise = useStore.getState().importOrganization(file, true)
      await vi.advanceTimersByTimeAsync(1000)
      await importPromise
      
      // Assert
      expect(sonner.toast.success).not.toHaveBeenCalled()
    })

    it('sets saveError state and returns false on failure', async () => {
      // Arrange
      mockPersistenceManager.importState.mockRejectedValue(new Error('Import failed'))
      const file = createMockFile('{}')
      
      // Act
      const importPromise = useStore.getState().importOrganization(file)
      await vi.advanceTimersByTimeAsync(1000)
      const result = await importPromise
      
      // Assert
      expect(result).toBe(false)
      expect(useStore.getState().saveError).toContain('Failed to import organization')
    })

    it('sets isLoading state to true during operation and false after', async () => {
      // Arrange
      const validState = createValidPersistedState()
      let loadingDuringImport = false
      
      mockPersistenceManager.importState.mockImplementation(async () => {
        loadingDuringImport = useStore.getState().isLoading
        return validState
      })
      const file = createMockFile(JSON.stringify(validState))
      
      // Act
      const importPromise = useStore.getState().importOrganization(file)
      
      // Check loading state immediately after starting
      expect(useStore.getState().isLoading).toBe(true)
      
      await vi.advanceTimersByTimeAsync(1000)
      await importPromise
      
      // Assert
      expect(loadingDuringImport).toBe(true)
      expect(useStore.getState().isLoading).toBe(false)
    })
  })

  describe('saveToLocalStorage', () => {
    it('saves to localStorage when organization exists and isInitialized=true', () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      useStore.setState({ isInitialized: true })
      
      // Act
      useStore.getState().saveToLocalStorage()
      
      // Assert
      expect(mockPersistenceManager.saveToLocalStorage).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Org' }),
        expect.any(Object),
        expect.any(Array)
      )
    })

    it('returns early when isInitialized=false', () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      // isInitialized is false by default
      
      // Act
      useStore.getState().saveToLocalStorage()
      
      // Assert
      expect(mockPersistenceManager.saveToLocalStorage).not.toHaveBeenCalled()
    })
  })

  describe('initializeFromLocalStorage', () => {
    it('restores organization, policies, attachments, and tutorialCompleted from stored data', () => {
      // Arrange
      const storedState: PersistedState = {
        version: '1.0.0',
        organization: createMinimalOrganization(),
        policies: {
          'default-scp-full-access': {
            id: 'default-scp-full-access',
            name: 'FullAWSAccess',
            type: 'scp',
            content: '{}',
            createdAt: new Date(),
            lastModified: new Date(),
          },
        },
        policyAttachments: [
          { policyId: 'default-scp-full-access', nodeId: 'root-1', attachedAt: new Date() },
        ],
        metadata: {
          lastSaved: new Date(),
          appVersion: '0.0.0',
          organizationVersion: '1.0',
        },
      }
      mockPersistenceManager.loadFromLocalStorage.mockReturnValue(storedState)
      mockPersistenceManager.loadTutorialCompleted.mockReturnValue(true)
      
      // Act
      useStore.getState().initializeFromLocalStorage()
      
      // Assert
      const state = useStore.getState()
      expect(state.organization).not.toBeNull()
      expect(state.organization?.name).toBe('Test Organization')
      expect(state.isInitialized).toBe(true)
      expect(state.tutorialCompleted).toBe(true)
    })

    it('sets isInitialized=true and loads tutorialCompleted when no stored data', () => {
      // Arrange
      mockPersistenceManager.loadFromLocalStorage.mockReturnValue(null)
      mockPersistenceManager.loadTutorialCompleted.mockReturnValue(true)
      
      // Act
      useStore.getState().initializeFromLocalStorage()
      
      // Assert
      const state = useStore.getState()
      expect(state.organization).toBeNull()
      expect(state.isInitialized).toBe(true)
      expect(state.tutorialCompleted).toBe(true)
    })

    it('creates default policies during restore when missing', () => {
      // Arrange
      const storedStateWithoutDefaults: PersistedState = {
        version: '1.0.0',
        organization: createMinimalOrganization(),
        policies: {},
        policyAttachments: [],
        metadata: {
          lastSaved: new Date(),
          appVersion: '0.0.0',
          organizationVersion: '1.0',
        },
      }
      mockPersistenceManager.loadFromLocalStorage.mockReturnValue(storedStateWithoutDefaults)
      
      // Act
      useStore.getState().initializeFromLocalStorage()
      
      // Assert
      const state = useStore.getState()
      expect(state.policies['default-scp-full-access']).toBeDefined()
      expect(state.policies['default-rcp-full-access']).toBeDefined()
    })

    it('only initializes once (isInitialized guard)', () => {
      // Arrange
      mockPersistenceManager.loadFromLocalStorage.mockReturnValue(null)
      
      // Act - call twice
      useStore.getState().initializeFromLocalStorage()
      useStore.getState().initializeFromLocalStorage()
      
      // Assert - loadFromLocalStorage should only be called once
      expect(mockPersistenceManager.loadFromLocalStorage).toHaveBeenCalledTimes(1)
    })

    it('calls refreshAllNodesPolicyData after successful restore', () => {
      // Arrange
      const storedState: PersistedState = {
        version: '1.0.0',
        organization: createMinimalOrganization(),
        policies: {},
        policyAttachments: [],
        metadata: {
          lastSaved: new Date(),
          appVersion: '0.0.0',
          organizationVersion: '1.0',
        },
      }
      mockPersistenceManager.loadFromLocalStorage.mockReturnValue(storedState)
      const refreshSpy = vi.spyOn(useStore.getState(), 'refreshAllNodesPolicyData')
      
      // Act
      useStore.getState().initializeFromLocalStorage()
      
      // Assert
      expect(refreshSpy).toHaveBeenCalled()
    })
  })

  describe('clearOrganization', () => {
    it('resets state to initial values', () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      useStore.setState({ isInitialized: true })
      
      // Act
      useStore.getState().clearOrganization()
      
      // Assert
      const state = useStore.getState()
      expect(state.organization).toBeNull()
      expect(state.policies).toEqual({})
      expect(state.policyAttachments).toEqual([])
      expect(state.selectedNodeId).toBeNull()
      expect(state.saveError).toBeNull()
    })

    it('calls setOrganizationVersion and clearLocalStorage', () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      
      // Act
      useStore.getState().clearOrganization()
      
      // Assert
      expect(mockPersistenceManager.setOrganizationVersion).toHaveBeenCalledWith('1.0')
      expect(mockPersistenceManager.clearLocalStorage).toHaveBeenCalled()
    })

    it('shows toast notification when silent=false', () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      
      // Act
      useStore.getState().clearOrganization(false)
      
      // Assert
      expect(sonner.toast.success).toHaveBeenCalledWith(
        'Organization Cleared',
        expect.any(Object)
      )
    })

    it('does not show toast notification when silent=true', () => {
      // Arrange
      useStore.getState().createOrganization('Test Org')
      vi.clearAllMocks()
      
      // Re-setup the mock after clearing
      vi.spyOn(persistenceModule, 'getPersistenceManager').mockReturnValue(
        mockPersistenceManager as unknown as PersistenceManager
      )
      
      // Act
      useStore.getState().clearOrganization(true)
      
      // Assert
      expect(sonner.toast.success).not.toHaveBeenCalled()
    })
  })

  describe('getOrganizationVersion', () => {
    it('returns correct version from PersistenceManager', () => {
      // Arrange
      mockPersistenceManager.getCurrentOrganizationVersion.mockReturnValue('2.5')
      
      // Act
      const version = useStore.getState().getOrganizationVersion()
      
      // Assert
      expect(version).toBe('2.5')
      expect(mockPersistenceManager.getCurrentOrganizationVersion).toHaveBeenCalled()
    })
  })
})

/**
 * Property-based tests for import validation robustness
 */
describe('persistenceSlice property-based tests', () => {
  let mockPersistenceManager: {
    exportState: ReturnType<typeof vi.fn>
    importState: ReturnType<typeof vi.fn>
    saveToLocalStorage: ReturnType<typeof vi.fn>
    loadFromLocalStorage: ReturnType<typeof vi.fn>
    clearLocalStorage: ReturnType<typeof vi.fn>
    getCurrentOrganizationVersion: ReturnType<typeof vi.fn>
    setOrganizationVersion: ReturnType<typeof vi.fn>
    loadTutorialCompleted: ReturnType<typeof vi.fn>
    saveTutorialCompleted: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    resetPersistenceManager()
    
    mockPersistenceManager = {
      exportState: vi.fn().mockResolvedValue(undefined),
      importState: vi.fn(),
      saveToLocalStorage: vi.fn().mockResolvedValue(undefined),
      loadFromLocalStorage: vi.fn().mockReturnValue(null),
      clearLocalStorage: vi.fn(),
      getCurrentOrganizationVersion: vi.fn().mockReturnValue('1.0'),
      setOrganizationVersion: vi.fn(),
      loadTutorialCompleted: vi.fn().mockReturnValue(false),
      saveTutorialCompleted: vi.fn(),
    }
    
    vi.spyOn(persistenceModule, 'getPersistenceManager').mockReturnValue(
      mockPersistenceManager as unknown as PersistenceManager
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property 2: Import Validation Handles Any JSON Gracefully
   * For any valid JSON value, calling importOrganization SHALL either:
   * - Successfully import the data and return true (if JSON matches PersistedState schema)
   * - Reject the data gracefully and return false (if JSON doesn't match schema)
   * - Never throw an unhandled exception
   * - Never leave the store in an inconsistent state
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.8**
   */
  it('handles any JSON value gracefully without throwing unhandled exceptions', async () => {
    await fc.assert(
      fc.asyncProperty(fc.jsonValue(), async (jsonValue) => {
        // Create fresh store for each test
        const store = createTestStore()
        
        // Reset mocks for this iteration
        vi.clearAllMocks()
        vi.spyOn(persistenceModule, 'getPersistenceManager').mockReturnValue(
          mockPersistenceManager as unknown as PersistenceManager
        )
        
        // Snapshot state before import
        const stateBefore = {
          organization: store.getState().organization,
          policies: { ...store.getState().policies },
          policyAttachments: [...store.getState().policyAttachments],
        }
        
        // Mock importState to simulate validation behavior
        // The real PersistenceManager.importState validates the JSON structure
        mockPersistenceManager.importState.mockImplementation(async () => {
          // Simulate validation - check if it looks like a valid PersistedState
          if (
            jsonValue &&
            typeof jsonValue === 'object' &&
            !Array.isArray(jsonValue) &&
            'version' in jsonValue &&
            'organization' in jsonValue &&
            jsonValue.organization &&
            typeof jsonValue.organization === 'object' &&
            'nodes' in jsonValue.organization &&
            'rootId' in jsonValue.organization
          ) {
            // Return a valid-looking state
            return {
              version: '1.0.0',
              organization: createMinimalOrganization(),
              policies: {},
              policyAttachments: [],
              metadata: {
                lastSaved: new Date(),
                appVersion: '0.0.0',
                organizationVersion: '1.0',
              },
            }
          }
          throw new Error('Invalid organization file format - missing required fields')
        })
        
        const file = createMockFile(JSON.stringify(jsonValue))
        
        // Act - should not throw
        let result: boolean
        let threwException = false
        
        try {
          const importPromise = store.getState().importOrganization(file)
          await vi.advanceTimersByTimeAsync(1000)
          result = await importPromise
        } catch {
          threwException = true
          result = false
        }
        
        // Assert - no unhandled exceptions
        if (threwException) {
          return false
        }
        
        // Result should be boolean
        if (typeof result !== 'boolean') {
          return false
        }
        
        // State consistency check
        const stateAfter = store.getState()
        
        if (!result) {
          // On failure, state should be unchanged (except for saveError and isLoading)
          if (stateAfter.organization !== stateBefore.organization) {
            return false
          }
        }
        
        // isLoading should be false after operation completes
        if (stateAfter.isLoading !== false) {
          return false
        }
        
        return true
      }),
      { numRuns: 100 }
    )
  })
})
