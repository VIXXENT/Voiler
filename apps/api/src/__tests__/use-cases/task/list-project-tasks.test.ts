import type { IProjectRepository, ITaskRepository, ProjectRecord, TaskRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createListProjectTasks } from '../../../use-cases/task/list-project-tasks'

/** Builds a fake ProjectRecord for test assertions. */
const makeFakeProject = (overrides?: Partial<ProjectRecord>): ProjectRecord => ({
  id: 'project-1',
  name: 'Test Project',
  description: null,
  status: 'active',
  ownerId: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
})

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
  updateStatus: vi.fn(),
  delete: vi.fn(),
  countByProject: vi.fn(),
  assignUser: vi.fn(),
  unassignUser: vi.fn(),
  findAssignees: vi.fn(),
})

describe('listProjectTasks use case', () => {
  it('returns tasks for a project on happy path', async () => {
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const project = makeFakeProject()
    const tasks = [makeFakeTask(), makeFakeTask({ id: 'task-2', title: 'Second Task' })]

    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(project))
    vi.mocked(taskRepo.findByProject).mockReturnValue(okAsync(tasks))

    const useCase = createListProjectTasks({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
    })
    const result = await useCase({ projectId: 'project-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(2)
    }
    expect(taskRepo.findByProject).toHaveBeenCalledWith({
      projectId: 'project-1',
      filters: undefined,
    })
  })

  it('returns ProjectNotFound when project does not exist', async () => {
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()

    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createListProjectTasks({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
    })
    const result = await useCase({ projectId: 'nonexistent' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
    expect(taskRepo.findByProject).not.toHaveBeenCalled()
  })

  it('passes filters to the task repository', async () => {
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const project = makeFakeProject()

    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(project))
    vi.mocked(taskRepo.findByProject).mockReturnValue(okAsync([]))

    const useCase = createListProjectTasks({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
    })
    await useCase({ projectId: 'project-1', filters: { status: 'done', priority: 'high' } })

    expect(taskRepo.findByProject).toHaveBeenCalledWith({
      projectId: 'project-1',
      filters: { status: 'done', priority: 'high' },
    })
  })

  it('propagates repository errors', async () => {
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const project = makeFakeProject()

    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(project))
    vi.mocked(taskRepo.findByProject).mockReturnValue(
      errAsync(infrastructureError({ message: 'db error' })),
    )

    const useCase = createListProjectTasks({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
    })
    const result = await useCase({ projectId: 'project-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
