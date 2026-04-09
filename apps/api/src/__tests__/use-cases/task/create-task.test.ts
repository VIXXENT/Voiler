import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ITaskRepository,
  ProjectRecord,
  TaskRecord,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createCreateTask } from '../../../use-cases/task/create-task'

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

/** Builds a mock IProjectMemberRepository with vi.fn() stubs. */
const makeMockMemberRepo = (): IProjectMemberRepository => ({
  addMember: vi.fn(),
  removeMember: vi.fn(),
  findByProject: vi.fn(),
  findMembership: vi.fn(),
  updateRole: vi.fn(),
  deleteByProject: vi.fn(),
  deleteByUser: vi.fn(),
})

describe('createTask use case', () => {
  it('returns Ok(TaskRecord) on happy path (owner)', async () => {
    const fakeProject = makeFakeProject()
    const fakeTask = makeFakeTask()
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))
    vi.mocked(taskRepo.create).mockReturnValue(okAsync(fakeTask))

    const useCase = createCreateTask({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', title: 'Test Task' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.title).toBe('Test Task')
      expect(result.value.projectId).toBe('proj-1')
    }
    expect(taskRepo.create).toHaveBeenCalledOnce()
  })

  it('returns Err(InvalidTaskTitle) when title is empty', async () => {
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const memberRepo = makeMockMemberRepo()

    const useCase = createCreateTask({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', title: '' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidTaskTitle')
    }
    expect(projectRepo.findById).not.toHaveBeenCalled()
    expect(taskRepo.create).not.toHaveBeenCalled()
  })

  it('returns Err(ProjectNotFound) when project does not exist', async () => {
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createCreateTask({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', title: 'Test Task' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
    expect(taskRepo.create).not.toHaveBeenCalled()
  })

  it('returns Err(NotAMember) when user is not owner and has no membership', async () => {
    const fakeProject = makeFakeProject()
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))

    const useCase = createCreateTask({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-99', projectId: 'proj-1', title: 'Test Task' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('NotAMember')
    }
    expect(taskRepo.create).not.toHaveBeenCalled()
  })

  it('returns Err(InsufficientPermission) when viewer tries to create a task', async () => {
    const fakeProject = makeFakeProject()
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(
      okAsync({ id: 'm-1', projectId: 'proj-1', userId: 'user-2', role: 'viewer', joinedAt: new Date() }),
    )

    const useCase = createCreateTask({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-2', projectId: 'proj-1', title: 'Test Task' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
    expect(taskRepo.create).not.toHaveBeenCalled()
  })

  it('returns Err when task repository create fails', async () => {
    const fakeProject = makeFakeProject()
    const projectRepo = makeMockProjectRepo()
    const taskRepo = makeMockTaskRepo()
    const memberRepo = makeMockMemberRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))
    vi.mocked(taskRepo.create).mockReturnValue(errAsync(repoError))

    const useCase = createCreateTask({
      projectRepository: projectRepo,
      taskRepository: taskRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', title: 'Test Task' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
