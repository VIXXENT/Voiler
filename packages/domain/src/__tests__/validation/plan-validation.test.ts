import { describe, it, expect } from 'vitest'

import type { PlanLimits } from '../../plans/plan-definitions'
import {
  checkProjectLimit,
  checkMemberLimit,
  checkTaskLimit,
  checkNotFrozen,
} from '../../validation/plan-validation'

const freeLimits: PlanLimits = { maxProjects: 3, maxMembersPerProject: 5, maxTasksPerProject: 50 }
const proLimits: PlanLimits = { maxProjects: -1, maxMembersPerProject: -1, maxTasksPerProject: -1 }

describe('checkProjectLimit', () => {
  it('returns ok when currentCount is under limit', () => {
    const result = checkProjectLimit({ currentCount: 2, limits: freeLimits })
    expect(result.isOk()).toBe(true)
  })

  it('returns err(ProjectLimitReached) when currentCount equals limit', () => {
    const result = checkProjectLimit({ currentCount: 3, limits: freeLimits })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectLimitReached')
    }
  })

  it('returns err(ProjectLimitReached) when currentCount exceeds limit', () => {
    const result = checkProjectLimit({ currentCount: 5, limits: freeLimits })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectLimitReached')
    }
  })

  it('always returns ok for unlimited plan (-1)', () => {
    const result = checkProjectLimit({ currentCount: 9999, limits: proLimits })
    expect(result.isOk()).toBe(true)
  })
})

describe('checkMemberLimit', () => {
  it('returns ok when currentCount is under limit', () => {
    const result = checkMemberLimit({ currentCount: 4, limits: freeLimits })
    expect(result.isOk()).toBe(true)
  })

  it('returns err(MemberLimitReached) when currentCount equals limit', () => {
    const result = checkMemberLimit({ currentCount: 5, limits: freeLimits })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('MemberLimitReached')
    }
  })

  it('returns err(MemberLimitReached) when currentCount exceeds limit', () => {
    const result = checkMemberLimit({ currentCount: 10, limits: freeLimits })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('MemberLimitReached')
    }
  })

  it('always returns ok for unlimited plan (-1)', () => {
    const result = checkMemberLimit({ currentCount: 9999, limits: proLimits })
    expect(result.isOk()).toBe(true)
  })
})

describe('checkTaskLimit', () => {
  it('returns ok when currentCount is under limit', () => {
    const result = checkTaskLimit({ currentCount: 49, limits: freeLimits })
    expect(result.isOk()).toBe(true)
  })

  it('returns err(TaskLimitReached) when currentCount equals limit', () => {
    const result = checkTaskLimit({ currentCount: 50, limits: freeLimits })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskLimitReached')
    }
  })

  it('returns err(TaskLimitReached) when currentCount exceeds limit', () => {
    const result = checkTaskLimit({ currentCount: 100, limits: freeLimits })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskLimitReached')
    }
  })

  it('always returns ok for unlimited plan (-1)', () => {
    const result = checkTaskLimit({ currentCount: 9999, limits: proLimits })
    expect(result.isOk()).toBe(true)
  })
})

describe('checkNotFrozen', () => {
  it('returns ok when frozen is false', () => {
    const result = checkNotFrozen({ frozen: false })
    expect(result.isOk()).toBe(true)
  })

  it('returns err(ProjectFrozen) when frozen is true', () => {
    const result = checkNotFrozen({ frozen: true })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectFrozen')
    }
  })
})
