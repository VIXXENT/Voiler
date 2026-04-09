import { infrastructureError } from '@voiler/core'
import type { ITaskRepository, TaskRecord } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createDeleteTask } from '../../../use-cases/task/delete-task'

/** Builds a fake TaskRecord for test assertions. */
const makeFakeTask = (overrides?: Partial<TaskRecord>): TaskRecord => ({
  id: 'task-1',
  title: 'Test Task',
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

describe('deleteTask use case', () => {
  it('deletes task on happy path', async () => {
    const repo = makeMockRepo()
    const task = makeFakeTask()

    vi.mocked(repo.findById).mockReturnValue(okAsync(task))
    vi.mocked(repo.delete).mockReturnValue(okAsync(true))

    const useCase = createDeleteTask({ taskRepository: repo })
    const result = await useCase({ taskId: 'task-1' })

    expect(result.isOk()).toBe(true)
    expect(repo.delete).toHaveBeenCalledWith({ id: 'task-1' })
  })

  it('returns TaskNotFound when task does not exist', async () => {
    const repo = makeMockRepo()

    vi.mocked(repo.findById).mockReturnValue(okAsync(null))

    const useCase = createDeleteTask({ taskRepository: repo })
    const result = await useCase({ taskId: 'nonexistent' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskNotFound')
    }
    expect(repo.delete).not.toHaveBeenCalled()
  })

  it('propagates repository errors', async () => {
    const repo = makeMockRepo()
    const task = makeFakeTask()

    vi.mocked(repo.findById).mockReturnValue(okAsync(task))
    vi.mocked(repo.delete).mockReturnValue(errAsync(infrastructureError({ message: 'db error' })))

    const useCase = createDeleteTask({ taskRepository: repo })
    const result = await useCase({ taskId: 'task-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
