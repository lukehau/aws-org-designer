import { describe, it, expect } from 'vitest'
import { cn } from './utils'

/**
 * Minimal tests for cn() utility
 * 
 * cn() is a thin wrapper around clsx + tailwind-merge.
 * We only test the essential behavior - Tailwind class conflict resolution -
 * which is the actual value-add of this utility.
 */
describe('cn', () => {
  it('merges multiple class names', () => {
    const result = cn('px-4', 'py-2', 'bg-blue-500')
    expect(result).toBe('px-4 py-2 bg-blue-500')
  })

  it('resolves Tailwind class conflicts by using the last one', () => {
    // This is the key behavior that tailwind-merge provides
    const result = cn('px-4', 'py-2', 'px-8')
    expect(result).toBe('py-2 px-8')
  })

  it('handles conditional classes', () => {
    const result = cn('base', { 'text-red-500': true, 'text-blue-500': false })
    expect(result).toBe('base text-red-500')
  })
})
