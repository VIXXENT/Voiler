import type { AppError, ITaskRepository, TaskRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createTransitionTaskStatus } from '../../../use-cases/task/transition-task-status'

/** Builds a fake TaskRecord for test assertions. */
const makeFakeTask = (): TaskRecord => ({
  id: 'task-1',
  projectId: 'proj-1',
  title: 'Test Task',
  description: null,
  status: 'todo',
  priority: 'medium',
  dueDate: null,
  createdBy: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
})

/** Builds a mock ITaskRepository with vi.fn() stubs. */
const makeMockTaskRepo = (): ITaskRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByProject: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  countByProject: vi.fn(),
})

describe('transitionTaskStatus use case', () => {
  it('returns Ok(TaskRecord) on valid transition todo→in_progress', async () => {
    const fakeTask = makeFakeTask()
    const updatedTask = { ...fakeTask, status: 'in_progress' as const }
    const taskRepo = makeMockTaskRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(taskRepo.update).mockReturnValue(okAsync(updatedTask))

    const useCase = createTransitionTaskStatus({ taskRepository: taskRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', newStatus: 'in_progress' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.status).toBe('in_progress')
    }
    expect(taskRepo.update).toHaveBeenCalledOnce()
  })

  it('returns Err(TaskNotFound) when task does not exist', async () => {
    const taskRepo = makeMockTaskRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createTransitionTaskStatus({ taskRepository: taskRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', newStatus: 'in_progress' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskNotFound')
    }
    expect(taskRepo.update).not.toHaveBeenCalled()
  })

  it('returns Err(InvalidStatusTransition) for invalid transition todo→done', async () => {
    const fakeTask = makeFakeTask()
    const taskRepo = makeMockTaskRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))

    const useCase = createTransitionTaskStatus({ taskRepository: taskRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', newStatus: 'done' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidStatusTransition')
    }
    expect(taskRepo.update).not.toHaveBeenCalled()
  })

  it('returns Err when repository update fails', async () => {
    const fakeTask = makeFakeTask()
    const taskRepo = makeMockTaskRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(taskRepo.update).mockReturnValue(errAsync(repoError))

    const useCase = createTransitionTaskStatus({ taskRepository: taskRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', newStatus: 'in_progress' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
