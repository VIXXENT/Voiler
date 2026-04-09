import type { AppError, ITaskAssigneeRepository, ITaskRepository, TaskRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createUnassignFromTask } from '../../../use-cases/task/unassign-from-task'

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

/** Builds a mock ITaskAssigneeRepository with vi.fn() stubs. */
const makeMockAssigneeRepo = (): ITaskAssigneeRepository => ({
  assign: vi.fn(),
  unassign: vi.fn(),
  findByTask: vi.fn(),
  findResponsible: vi.fn(),
  deleteByTask: vi.fn(),
})

describe('unassignFromTask use case', () => {
  it('returns Ok(void) on happy path', async () => {
    const fakeTask = makeFakeTask()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(assigneeRepo.unassign).mockReturnValue(okAsync(undefined))

    const useCase = createUnassignFromTask({ taskRepository: taskRepo, taskAssigneeRepository: assigneeRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', targetUserId: 'user-2' })

    expect(result.isOk()).toBe(true)
    expect(assigneeRepo.unassign).toHaveBeenCalledOnce()
  })

  it('returns Err(TaskNotFound) when task does not exist', async () => {
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createUnassignFromTask({ taskRepository: taskRepo, taskAssigneeRepository: assigneeRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', targetUserId: 'user-2' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskNotFound')
    }
    expect(assigneeRepo.unassign).not.toHaveBeenCalled()
  })

  it('returns Err when unassign repository call fails', async () => {
    const fakeTask = makeFakeTask()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(assigneeRepo.unassign).mockReturnValue(errAsync(repoError))

    const useCase = createUnassignFromTask({ taskRepository: taskRepo, taskAssigneeRepository: assigneeRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', targetUserId: 'user-2' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
