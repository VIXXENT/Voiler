import { describe, it, expect } from 'vitest'

import { createEmail } from '../../value-objects/email'

describe('createEmail', () => {
  it('returns Ok(Email) for a valid email', () => {
    const result = createEmail({ value: 'test@example.com' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(String(result.value)).toBe('test@example.com')
    }
  })

  it('returns Err(InvalidEmail) for email without @', () => {
    const result = createEmail({ value: 'invalid-email' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidEmail')
    }
  })

  it('returns Err(InvalidEmail) for email without domain dot', () => {
    const result = createEmail({ value: 'user@localhost' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidEmail')
    }
  })

  it('returns Err(InvalidEmail) for empty string', () => {
    const result = createEmail({ value: '' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidEmail')
    }
  })

  it('trims whitespace and lowercases', () => {
    const result = createEmail({
      value: '  Test@Example.COM  ',
    })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(String(result.value)).toBe('test@example.com')
    }
  })
})
