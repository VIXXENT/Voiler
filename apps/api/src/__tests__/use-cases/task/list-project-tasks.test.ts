import type { AppError, IProjectRepository, ITaskRepository, ProjectRecord, TaskRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createListProjectTasks } from '../../../use-cases/task/list-project-tasks'

/** Builds a fake ProjectRecord for test assertions. */
const makeFakeProject = (): ProjectRecord => ({
  id: 'proj-1',
  name: 'Test Project',
  description: null,
  ownerId: 'user-1',
  status: 'active',
  frozen: false,
  unfrozenAt: null,
  cooldownMinutes: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
})

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

/** Builds a mock IProjectRepository with vi.fn() stubs. */
const makeMockProjectRepo = (): IProjectRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByOwner: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  countByOwner: vi.fn(),
  deleteWithCascade: vi.fn(),
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

describe('listProjectTasks use case', () => {
  it('returns Ok(TaskRecord[]) on happy path', async () => {
    const fakeProject = makeFakeProject()
    const fakeTask = makeFakeTask()
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(taskRepo.findByProject).mockReturnValue(okAsync([fakeTask]))

    const useCase = createListProjectTasks({ projectRepository: projectRepo, taskRepository: taskRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]?.projectId).toBe('proj-1')
    }
    expect(taskRepo.findByProject).toHaveBeenCalledOnce()
  })

  it('returns Ok([]) when project has no tasks', async () => {
    const fakeProject = makeFakeProject()
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(taskRepo.findByProject).mockReturnValue(okAsync([]))

    const useCase = createListProjectTasks({ projectRepository: projectRepo, taskRepository: taskRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(0)
    }
  })

  it('returns Err(ProjectNotFound) when project does not exist', async () => {
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createListProjectTasks({ projectRepository: projectRepo, taskRepository: taskRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
    expect(taskRepo.findByProject).not.toHaveBeenCalled()
  })

  it('returns Err when findByProject fails', async () => {
    const fakeProject = makeFakeProject()
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(taskRepo.findByProject).mockReturnValue(errAsync(repoError))

    const useCase = createListProjectTasks({ projectRepository: projectRepo, taskRepository: taskRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
