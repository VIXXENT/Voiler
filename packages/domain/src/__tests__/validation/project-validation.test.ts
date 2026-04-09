import { describe, it, expect } from 'vitest'

import { validateProjectName } from '../../validation/project-validation'

describe('validateProjectName', () => {
  it('returns Ok(string) for a valid name', () => {
    const result = validateProjectName({ name: 'My Project' })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe('My Project')
    }
  })

  it('trims surrounding whitespace', () => {
    const result = validateProjectName({ name: '  Trimmed  ' })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe('Trimmed')
    }
  })

  it('returns Err(InvalidProjectName) for an empty string', () => {
    const result = validateProjectName({ name: '' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidProjectName')
    }
  })

  it('returns Err(InvalidProjectName) for a whitespace-only string', () => {
    const result = validateProjectName({ name: '   ' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidProjectName')
    }
  })

  it('returns Ok for a name exactly 100 characters long', () => {
    const name = 'a'.repeat(100)
    const result = validateProjectName({ name })
    expect(result.isOk()).toBe(true)
  })

  it('returns Err(InvalidProjectName) for a name exceeding 100 characters', () => {
    const name = 'a'.repeat(101)
    const result = validateProjectName({ name })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidProjectName')
    }
  })
})
