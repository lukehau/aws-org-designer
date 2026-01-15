import { vi, beforeEach, afterEach } from 'vitest'
import * as sonner from 'sonner'

// Set up toast spies before each test
beforeEach(() => {
  vi.spyOn(sonner.toast, 'success').mockImplementation(() => '')
  vi.spyOn(sonner.toast, 'error').mockImplementation(() => '')
})

// Set up fake timers for UX delays in import operations
beforeEach(() => {
  vi.useFakeTimers()
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})
