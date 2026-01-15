import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { PersistenceManager, getPersistenceManager } from './persistence'
import type { Organization } from '../types/organization'

/**
 * Helper to reset the singleton instance for testing
 */
const resetPersistenceManager = () => {
  // @ts-expect-error - accessing private static for testing
  PersistenceManager.instance = undefined
}

/**
 * Helper to create a mock localStorage
 */
const createMockLocalStorage = () => {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]) }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    _store: store, // For test inspection
  }
}

describe('PersistenceManager', () => {
  let manager: PersistenceManager
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>

  beforeEach(() => {
    resetPersistenceManager()
    manager = PersistenceManager.getInstance()
    mockLocalStorage = createMockLocalStorage()
    vi.stubGlobal('localStorage', mockLocalStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('singleton pattern', () => {
    it('returns the same instance on multiple calls', () => {
      const instance1 = PersistenceManager.getInstance()
      const instance2 = PersistenceManager.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('getPersistenceManager returns the singleton instance', () => {
      const instance = getPersistenceManager()
      expect(instance).toBe(manager)
    })
  })

  describe('version incrementing', () => {
    it('increments version from 1.0 to 1.1', () => {
      const result = manager.incrementVersion('1.0')
      expect(result).toBe('1.1')
    })

    it('increments version from 1.9 to 1.10', () => {
      const result = manager.incrementVersion('1.9')
      expect(result).toBe('1.10')
    })

    it('increments version from 2.5 to 2.6', () => {
      const result = manager.incrementVersion('2.5')
      expect(result).toBe('2.6')
    })

    it('handles version with no minor number', () => {
      const result = manager.incrementVersion('1')
      expect(result).toBe('1.1')
    })

    it('handles empty string by defaulting to 1.1', () => {
      const result = manager.incrementVersion('')
      expect(result).toBe('1.1')
    })

    it('increments from 1.99 to 1.100', () => {
      const result = manager.incrementVersion('1.99')
      expect(result).toBe('1.100')
    })
  })

  describe('filename sanitization', () => {
    it('converts to lowercase', () => {
      const result = manager.sanitizeFilename('MyOrganization')
      expect(result).toBe('myorganization')
    })

    it('removes special characters', () => {
      const result = manager.sanitizeFilename('My@Org#Name!')
      expect(result).toBe('my-org-name')
    })

    it('replaces spaces with hyphens', () => {
      const result = manager.sanitizeFilename('My Organization Name')
      expect(result).toBe('my-organization-name')
    })

    it('collapses multiple hyphens into one', () => {
      const result = manager.sanitizeFilename('My---Org---Name')
      expect(result).toBe('my-org-name')
    })

    it('removes leading and trailing hyphens', () => {
      const result = manager.sanitizeFilename('---My Org---')
      expect(result).toBe('my-org')
    })

    it('handles numbers correctly', () => {
      const result = manager.sanitizeFilename('Org123Name456')
      expect(result).toBe('org123name456')
    })

    it('handles mixed special characters and spaces', () => {
      const result = manager.sanitizeFilename('My Org @ 2024!')
      expect(result).toBe('my-org-2024')
    })

    it('returns empty string for all special characters', () => {
      const result = manager.sanitizeFilename('!@#$%^&*()')
      expect(result).toBe('')
    })
  })

  describe('localStorage save/load', () => {
    const createMinimalOrganization = (): Organization => ({
      id: 'org-1',
      name: 'Test Org',
      rootId: 'root-1',
      nodes: {
        'root-1': {
          id: 'root-1',
          type: 'root' as const,
          name: 'Test Org',
          parentId: null,
          children: [],
          position: { x: 0, y: 0 },
          metadata: {
            createdAt: new Date('2024-01-01'),
            lastModified: new Date('2024-01-01'),
          },
        },
      },
      limits: {
        maxAccounts: 10,
        maxOUs: 2000,
        maxNestingLevels: 5,
        maxSCPsPerNode: 5,
        maxRCPsPerNode: 5,
        maxPolicySize: 5120,
      },
    })

    it('saves state to localStorage', async () => {
      const org = createMinimalOrganization()
      const policies = {}
      const attachments: never[] = []

      await manager.saveToLocalStorage(org, policies, attachments)

      expect(mockLocalStorage.setItem).toHaveBeenCalled()
      const savedData = mockLocalStorage._store['aws-org-designer-state']
      expect(savedData).toBeDefined()
      
      const parsed = JSON.parse(savedData)
      expect(parsed.organization.name).toBe('Test Org')
      expect(parsed.version).toBe('1.0.0')
    })

    it('clears localStorage when organization is null', async () => {
      await manager.saveToLocalStorage(null, {}, [])

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('aws-org-designer-state')
    })

    it('loads state from localStorage', async () => {
      const org = createMinimalOrganization()
      await manager.saveToLocalStorage(org, {}, [])

      // Reset manager to simulate fresh load
      resetPersistenceManager()
      const newManager = PersistenceManager.getInstance()

      const loaded = newManager.loadFromLocalStorage()

      expect(loaded).not.toBeNull()
      expect(loaded?.organization.name).toBe('Test Org')
    })

    it('returns null when localStorage is empty', () => {
      const loaded = manager.loadFromLocalStorage()
      expect(loaded).toBeNull()
    })

    it('returns null and clears invalid data', () => {
      // Suppress expected console.warn output
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockLocalStorage._store['aws-org-designer-state'] = 'invalid json {'

      const loaded = manager.loadFromLocalStorage()

      expect(loaded).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('aws-org-designer-state')
    })

    it('returns null for data missing required fields', () => {
      // Suppress expected console.warn output
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockLocalStorage._store['aws-org-designer-state'] = JSON.stringify({
        version: '1.0.0',
        // missing organization
      })

      const loaded = manager.loadFromLocalStorage()

      expect(loaded).toBeNull()
    })

    it('converts date strings back to Date objects on load', async () => {
      const org = createMinimalOrganization()
      await manager.saveToLocalStorage(org, {}, [])

      resetPersistenceManager()
      const newManager = PersistenceManager.getInstance()
      const loaded = newManager.loadFromLocalStorage()

      expect(loaded?.metadata.lastSaved).toBeInstanceOf(Date)
      expect(loaded?.organization.nodes['root-1'].metadata.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('clearLocalStorage', () => {
    it('removes the state from localStorage', async () => {
      const org: Organization = {
        id: 'org-1',
        name: 'Test Org',
        rootId: 'root-1',
        nodes: {
          'root-1': {
            id: 'root-1',
            type: 'root' as const,
            name: 'Test Org',
            parentId: null,
            children: [],
            position: { x: 0, y: 0 },
            metadata: {
              createdAt: new Date(),
              lastModified: new Date(),
            },
          },
        },
        limits: {
          maxAccounts: 10,
          maxOUs: 2000,
          maxNestingLevels: 5,
          maxSCPsPerNode: 5,
          maxRCPsPerNode: 5,
          maxPolicySize: 5120,
        },
      }
      await manager.saveToLocalStorage(org, {}, [])

      manager.clearLocalStorage()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('aws-org-designer-state')
    })
  })

  describe('tutorial completion', () => {
    it('saves tutorial completion status', () => {
      manager.saveTutorialCompleted(true)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'aws-org-designer-tutorial-completed',
        'true'
      )
    })

    it('loads tutorial completion status', () => {
      mockLocalStorage._store['aws-org-designer-tutorial-completed'] = 'true'

      const completed = manager.loadTutorialCompleted()

      expect(completed).toBe(true)
    })

    it('returns false when tutorial status not set', () => {
      const completed = manager.loadTutorialCompleted()
      expect(completed).toBe(false)
    })
  })
})



describe('PersistenceManager property-based tests', () => {
  let manager: PersistenceManager

  beforeEach(() => {
    resetPersistenceManager()
    manager = PersistenceManager.getInstance()
  })

  // Arbitrary for generating valid version strings (major.minor format)
  const versionArb = fc.tuple(
    fc.integer({ min: 1, max: 100 }),
    fc.integer({ min: 0, max: 1000 })
  ).map(([major, minor]) => `${major}.${minor}`)

  // Arbitrary for generating arbitrary strings for filename sanitization
  const filenameInputArb = fc.string({ minLength: 0, maxLength: 100 })

  /**
   * Property 8: Version Always Increases After Increment
   * For any version string in "major.minor" format, incrementing the version
   * SHALL produce a version with a higher minor number and preserve major.
   * **Validates: Requirements 8.2**
   */
  it('version increment is monotonic and preserves major version', () => {
    fc.assert(
      fc.property(versionArb, (version) => {
        const [majorBefore, minorBefore] = version.split('.').map(Number)
        const result = manager.incrementVersion(version)
        const [majorAfter, minorAfter] = result.split('.').map(Number)
        
        // Minor version should increase by exactly 1, major should stay same
        return minorAfter === minorBefore + 1 && majorAfter === majorBefore
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9: Filename Sanitization Produces Safe Output
   * For any input string, sanitizeFilename SHALL produce a string containing
   * only lowercase letters, numbers, and hyphens (no leading/trailing/consecutive hyphens).
   * **Validates: Requirements 8.3**
   */
  it('filename sanitization produces safe output', () => {
    fc.assert(
      fc.property(filenameInputArb, (input) => {
        const result = manager.sanitizeFilename(input)
        
        // Result should only contain a-z, 0-9, and hyphens
        const validPattern = /^[a-z0-9-]*$/
        if (!validPattern.test(result)) return false
        
        // If result is non-empty, no leading/trailing hyphens or consecutive hyphens
        if (result.length === 0) return true
        return !result.startsWith('-') && !result.endsWith('-') && !result.includes('--')
      }),
      { numRuns: 100 }
    )
  })
})
