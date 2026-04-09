import { infrastructureError } from '@voiler/core'
import type { ITaskRepository, TaskRecord } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createUpdateTask } from '../../../use-cases/task/update-task'

/** Builds a fake TaskRecord for test assertions. */
const makeFakeTask = (overrides?: Partial<TaskRecord>): TaskRecord => ({
  id: 'task-1',
  title: 'Original Title',
  description: null,
  status: 'todo',
  priority: 'medium',
  projectId: 'project-1',
  createdBy: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
})

/** Builds a mock ITaskRepository with vi.fn() stubs. */
const makeMockRepo = (): ITaskRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByProject: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
  countByProject: vi.fn(),
  assignUser: vi.fn(),
  unassignUser: vi.fn(),
  findAssignees: vi.fn(),
})

describe('updateTask use case', () => {
  it('updates task fields on happy path', async () => {
    const repo = makeMockRepo()
    const task = makeFakeTask()
    const updated = makeFakeTask({ title: 'New Title', priority: 'high' })

    vi.mocked(repo.findById).mockReturnValue(okAsync(task))
    vi.mocked(repo.update).mockReturnValue(okAsync(updated))

    const useCase = createUpdateTask({ taskRepository: repo })
    const result = await useCase({ taskId: 'task-1', title: 'New Title', priority: 'high' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.title).toBe('New Title')
      expect(result.value.priority).toBe('high')
    }
    expect(repo.update).toHaveBeenCalledWith({
      id: 'task-1',
      data: { title: 'New Title', description: undefined, priority: 'high' },
    })
  })

  it('returns InvalidTaskTitle for empty title', async () => {
    const repo = makeMockRepo()

    const useCase = createUpdateTask({ taskRepository: repo })
    const result = await useCase({ taskId: 'task-1', title: '   ' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidTaskTitle')
    }
    expect(repo.findById).not.toHaveBeenCalled()
  })

  it('returns TaskNotFound when task does not exist', async () => {
    const repo = makeMockRepo()

    vi.mocked(repo.findById).mockReturnValue(okAsync(null))

    const useCase = createUpdateTask({ taskRepository: repo })
    const result = await useCase({ taskId: 'nonexistent', title: 'Valid Title' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskNotFound')
    }
  })

  it('propagates repository errors', async () => {
    const repo = makeMockRepo()
    const task = makeFakeTask()

    vi.mocked(repo.findById).mockReturnValue(okAsync(task))
    vi.mocked(repo.update).mockReturnValue(errAsync(infrastructureError({ message: 'db error' })))

    const useCase = createUpdateTask({ taskRepository: repo })
    const result = await useCase({ taskId: 'task-1', title: 'New Title' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
