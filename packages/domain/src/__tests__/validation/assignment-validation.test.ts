import { describe, it, expect } from 'vitest'
import { canAssignResponsible } from '../../validation/assignment-validation'

describe('canAssignResponsible', () => {
  it('returns Ok when no responsible is currently assigned (null)', () => {
    const result = canAssignResponsible({
      currentResponsibleUserId: null,
      newUserId: 'user-1',
    })
    expect(result.isOk()).toBe(true)
  })

  it('returns Ok when assigning the same user (idempotent)', () => {
    const result = canAssignResponsible({
      currentResponsibleUserId: 'user-1',
      newUserId: 'user-1',
    })
    expect(result.isOk()).toBe(true)
  })

  it('returns Err(InvalidAssignment) when a different user is already responsible', () => {
    const result = canAssignResponsible({
      currentResponsibleUserId: 'user-1',
      newUserId: 'user-2',
    })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidAssignment')
    }
  })
})
