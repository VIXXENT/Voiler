import { describe, it, expect } from 'vitest'

import { resolveProjectRole, canPerformAction } from '../../validation/permission-validation'

describe('resolveProjectRole', () => {
  it("returns 'owner' when userId equals ownerId", () => {
    const result = resolveProjectRole({ userId: 'u1', ownerId: 'u1', membershipRole: null })
    expect(result).toBe('owner')
  })

  it("returns 'owner' when userId equals ownerId even if membershipRole is set", () => {
    const result = resolveProjectRole({ userId: 'u1', ownerId: 'u1', membershipRole: 'viewer' })
    expect(result).toBe('owner')
  })

  it("returns 'member' from membershipRole when user is not owner", () => {
    const result = resolveProjectRole({ userId: 'u2', ownerId: 'u1', membershipRole: 'member' })
    expect(result).toBe('member')
  })

  it("returns 'viewer' from membershipRole when user is not owner", () => {
    const result = resolveProjectRole({ userId: 'u2', ownerId: 'u1', membershipRole: 'viewer' })
    expect(result).toBe('viewer')
  })

  it('returns null when user is not owner and membershipRole is null', () => {
    const result = resolveProjectRole({ userId: 'u2', ownerId: 'u1', membershipRole: null })
    expect(result).toBeNull()
  })
})

describe('canPerformAction', () => {
  it("owner can perform 'read'", () => {
    const result = canPerformAction({ role: 'owner', action: 'read' })
    expect(result.isOk()).toBe(true)
  })

  it("owner can perform 'mutate'", () => {
    const result = canPerformAction({ role: 'owner', action: 'mutate' })
    expect(result.isOk()).toBe(true)
  })

  it("owner can perform 'admin'", () => {
    const result = canPerformAction({ role: 'owner', action: 'admin' })
    expect(result.isOk()).toBe(true)
  })

  it("member can perform 'read'", () => {
    const result = canPerformAction({ role: 'member', action: 'read' })
    expect(result.isOk()).toBe(true)
  })

  it("member can perform 'mutate'", () => {
    const result = canPerformAction({ role: 'member', action: 'mutate' })
    expect(result.isOk()).toBe(true)
  })

  it("member cannot perform 'admin'", () => {
    const result = canPerformAction({ role: 'member', action: 'admin' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
  })

  it("viewer can perform 'read'", () => {
    const result = canPerformAction({ role: 'viewer', action: 'read' })
    expect(result.isOk()).toBe(true)
  })

  it("viewer cannot perform 'mutate'", () => {
    const result = canPerformAction({ role: 'viewer', action: 'mutate' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
  })

  it("viewer cannot perform 'admin'", () => {
    const result = canPerformAction({ role: 'viewer', action: 'admin' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
  })
})
