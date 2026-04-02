import { describe, it, expect } from 'vitest'

import { createUserId } from '../../value-objects/user-id'

describe('createUserId', () => {
  it('returns Ok(UserId) for a non-empty string', () => {
    const result = createUserId({ value: 'abc-123' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(String(result.value)).toBe('abc-123')
    }
  })

  it('returns Err for an empty string', () => {
    const result = createUserId({ value: '' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidUserId')
    }
  })

  it('returns Err for a string containing only whitespace', () => {
    const result = createUserId({ value: '   ' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidUserId')
    }
  })
})
