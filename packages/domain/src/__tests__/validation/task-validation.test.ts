import { describe, it, expect } from 'vitest'

import { validateTaskTitle, canTransitionStatus } from '../../validation/task-validation'
import type { TaskStatus } from '../../validation/task-validation'

describe('validateTaskTitle', () => {
  it('returns Ok(string) for a valid title', () => {
    const result = validateTaskTitle({ title: 'Fix login bug' })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe('Fix login bug')
    }
  })

  it('trims surrounding whitespace', () => {
    const result = validateTaskTitle({ title: '  Trimmed Title  ' })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe('Trimmed Title')
    }
  })

  it('returns Err(InvalidTaskTitle) for an empty string', () => {
    const result = validateTaskTitle({ title: '' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidTaskTitle')
    }
  })

  it('returns Err(InvalidTaskTitle) for a whitespace-only string', () => {
    const result = validateTaskTitle({ title: '   ' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidTaskTitle')
    }
  })

  it('returns Ok for a title exactly 200 characters long', () => {
    const title = 'a'.repeat(200)
    const result = validateTaskTitle({ title })
    expect(result.isOk()).toBe(true)
  })

  it('returns Err(InvalidTaskTitle) for a title exceeding 200 characters', () => {
    const title = 'a'.repeat(201)
    const result = validateTaskTitle({ title })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidTaskTitle')
    }
  })
})

describe('canTransitionStatus', () => {
  const validTransitions: readonly { from: TaskStatus; to: TaskStatus }[] = [
    { from: 'todo', to: 'in_progress' },
    { from: 'in_progress', to: 'done' },
    { from: 'done', to: 'in_progress' },
    { from: 'in_progress', to: 'todo' },
  ]

  for (const { from, to } of validTransitions) {
    it(`returns Ok(${to}) for valid transition ${from}→${to}`, () => {
      const result = canTransitionStatus({ from, to })
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe(to)
      }
    })
  }

  it('returns Err(InvalidStatusTransition) for todo→done', () => {
    const result = canTransitionStatus({ from: 'todo', to: 'done' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidStatusTransition')
    }
  })

  it('returns Err(InvalidStatusTransition) for done→todo', () => {
    const result = canTransitionStatus({ from: 'done', to: 'todo' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidStatusTransition')
    }
  })

  it('returns Err(InvalidStatusTransition) for todo→todo (same state)', () => {
    const result = canTransitionStatus({ from: 'todo', to: 'todo' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidStatusTransition')
    }
  })

  it('returns Err(InvalidStatusTransition) for in_progress→in_progress (same state)', () => {
    const result = canTransitionStatus({ from: 'in_progress', to: 'in_progress' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidStatusTransition')
    }
  })

  it('returns Err(InvalidStatusTransition) for done→done (same state)', () => {
    const result = canTransitionStatus({ from: 'done', to: 'done' })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidStatusTransition')
    }
  })
})
