import type { AppError, ITaskAssigneeRepository, ITaskRepository, TaskRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createDeleteTask } from '../../../use-cases/task/delete-task'

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

describe('deleteTask use case', () => {
  it('returns Ok(void) and deletes assignees then task on happy path', async () => {
    const fakeTask = makeFakeTask()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(assigneeRepo.deleteByTask).mockReturnValue(okAsync(undefined))
    vi.mocked(taskRepo.delete).mockReturnValue(okAsync(undefined))

    const useCase = createDeleteTask({ taskRepository: taskRepo, taskAssigneeRepository: assigneeRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1' })

    expect(result.isOk()).toBe(true)
    expect(assigneeRepo.deleteByTask).toHaveBeenCalledOnce()
    expect(taskRepo.delete).toHaveBeenCalledOnce()
  })

  it('returns Err(TaskNotFound) when task does not exist', async () => {
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createDeleteTask({ taskRepository: taskRepo, taskAssigneeRepository: assigneeRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskNotFound')
    }
    expect(assigneeRepo.deleteByTask).not.toHaveBeenCalled()
    expect(taskRepo.delete).not.toHaveBeenCalled()
  })

  it('returns Err when deleteByTask fails', async () => {
    const fakeTask = makeFakeTask()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(assigneeRepo.deleteByTask).mockReturnValue(errAsync(repoError))

    const useCase = createDeleteTask({ taskRepository: taskRepo, taskAssigneeRepository: assigneeRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
    expect(taskRepo.delete).not.toHaveBeenCalled()
  })

  it('returns Err when task delete fails', async () => {
    const fakeTask = makeFakeTask()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(assigneeRepo.deleteByTask).mockReturnValue(okAsync(undefined))
    vi.mocked(taskRepo.delete).mockReturnValue(errAsync(repoError))

    const useCase = createDeleteTask({ taskRepository: taskRepo, taskAssigneeRepository: assigneeRepo })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
