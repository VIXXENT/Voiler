import { describe, it, expect } from 'vitest'

import { validateMemberRole } from '../../validation/member-validation'

describe('validateMemberRole', () => {
  it("returns Ok('member') for role 'member'", () => {
    const result = validateMemberRole({ role: 'member' })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe('member')
    }
  })

  it("returns Ok('viewer') for role 'viewer'", () => {
    const result = validateMemberRole({ role: 'viewer' })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe('viewer')
    }
  })

  it("returns Err(InvalidAssignment) for role 'owner'", () => {
    const result = validateMemberRole({ role: 'owner' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidAssignment')
    }
  })

  it("returns Err(InvalidAssignment) for role 'admin'", () => {
    const result = validateMemberRole({ role: 'admin' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidAssignment')
    }
  })

  it('returns Err(InvalidAssignment) for empty string', () => {
    const result = validateMemberRole({ role: '' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidAssignment')
    }
  })
})
