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

import { createUpdateTask } from '../../../use-cases/task/update-task'

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

describe('updateTask use case', () => {
  it('returns Ok(TaskRecord) when owner updates title', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const updatedTask = { ...fakeTask, title: 'Updated Title' }
    const taskRepo = makeMockTaskRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))
    vi.mocked(taskRepo.update).mockReturnValue(okAsync(updatedTask))

    const useCase = createUpdateTask({
      taskRepository: taskRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', title: 'Updated Title' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.title).toBe('Updated Title')
    }
    expect(taskRepo.update).toHaveBeenCalledOnce()
  })

  it('returns Ok(TaskRecord) when updating without title', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const updatedTask = { ...fakeTask, priority: 'high' as const }
    const taskRepo = makeMockTaskRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))
    vi.mocked(taskRepo.update).mockReturnValue(okAsync(updatedTask))

    const useCase = createUpdateTask({
      taskRepository: taskRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', priority: 'high' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.priority).toBe('high')
    }
    expect(taskRepo.update).toHaveBeenCalledOnce()
  })

  it('returns Err(InvalidTaskTitle) when title is empty', async () => {
    const taskRepo = makeMockTaskRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()

    const useCase = createUpdateTask({
      taskRepository: taskRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', title: '' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidTaskTitle')
    }
    expect(taskRepo.findById).not.toHaveBeenCalled()
    expect(taskRepo.update).not.toHaveBeenCalled()
  })

  it('returns Err(TaskNotFound) when task does not exist', async () => {
    const taskRepo = makeMockTaskRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createUpdateTask({
      taskRepository: taskRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', title: 'New Title' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskNotFound')
    }
    expect(taskRepo.update).not.toHaveBeenCalled()
  })

  it('returns Err(NotAMember) when user is not owner and has no membership', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))

    const useCase = createUpdateTask({
      taskRepository: taskRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-99', taskId: 'task-1', title: 'New Title' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('NotAMember')
    }
    expect(taskRepo.update).not.toHaveBeenCalled()
  })

  it('returns Err(InsufficientPermission) when viewer tries to update', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(
      okAsync({
        id: 'm-1',
        projectId: 'proj-1',
        userId: 'user-2',
        role: 'viewer',
        joinedAt: new Date(),
      }),
    )

    const useCase = createUpdateTask({
      taskRepository: taskRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-2', taskId: 'task-1', title: 'New Title' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
    expect(taskRepo.update).not.toHaveBeenCalled()
  })

  it('returns Err when repository update fails', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))
    vi.mocked(taskRepo.update).mockReturnValue(errAsync(repoError))

    const useCase = createUpdateTask({
      taskRepository: taskRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1', title: 'New Title' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
