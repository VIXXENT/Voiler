import { describe, it, expect } from 'vitest'

import { createPassword } from '../../value-objects/password'

describe('createPassword', () => {
  it('returns Ok(Password) for valid password with 8+ chars', () => {
    const result = createPassword({
      value: 'Pass1234',
    })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(String(result.value)).toBe('Pass1234')
    }
  })

  it('returns Err(InvalidPassword) when too short', () => {
    const result = createPassword({ value: 'Ab1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidPassword')
    }
  })

  it('returns Err(WeakPassword) when no digit present', () => {
    const result = createPassword({
      value: 'Abcdefgh',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('WeakPassword')
    }
  })

  it('returns Err(WeakPassword) when no letter present', () => {
    const result = createPassword({
      value: '12345678',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('WeakPassword')
    }
  })

  it('returns Err(InvalidPassword) for empty string', () => {
    const result = createPassword({ value: '' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidPassword')
    }
  })
})
