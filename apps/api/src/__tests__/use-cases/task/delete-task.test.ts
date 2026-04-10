import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ITaskAssigneeRepository,
  ITaskRepository,
  ProjectRecord,
  TaskRecord,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createDeleteTask } from '../../../use-cases/task/delete-task'

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

/** Builds a mock ITaskAssigneeRepository with vi.fn() stubs. */
const makeMockAssigneeRepo = (): ITaskAssigneeRepository => ({
  assign: vi.fn(),
  unassign: vi.fn(),
  findByTask: vi.fn(),
  findResponsible: vi.fn(),
  deleteByTask: vi.fn(),
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
  findProjectIdsByUser: vi.fn(),
})

describe('deleteTask use case', () => {
  it('returns Ok(void) and deletes assignees then task on happy path (owner)', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))
    vi.mocked(assigneeRepo.deleteByTask).mockReturnValue(okAsync(undefined))
    vi.mocked(taskRepo.delete).mockReturnValue(okAsync(undefined))

    const useCase = createDeleteTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1' })

    expect(result.isOk()).toBe(true)
    expect(assigneeRepo.deleteByTask).toHaveBeenCalledOnce()
    expect(taskRepo.delete).toHaveBeenCalledOnce()
  })

  it('returns Err(TaskNotFound) when task does not exist', async () => {
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createDeleteTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskNotFound')
    }
    expect(assigneeRepo.deleteByTask).not.toHaveBeenCalled()
    expect(taskRepo.delete).not.toHaveBeenCalled()
  })

  it('returns Err(NotAMember) when user has no membership and is not owner', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))

    const useCase = createDeleteTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-99', taskId: 'task-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('NotAMember')
    }
    expect(assigneeRepo.deleteByTask).not.toHaveBeenCalled()
    expect(taskRepo.delete).not.toHaveBeenCalled()
  })

  it('returns Err(InsufficientPermission) when viewer tries to delete', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
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

    const useCase = createDeleteTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-2', taskId: 'task-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
    expect(assigneeRepo.deleteByTask).not.toHaveBeenCalled()
    expect(taskRepo.delete).not.toHaveBeenCalled()
  })

  it('returns Err when deleteByTask fails', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))
    vi.mocked(assigneeRepo.deleteByTask).mockReturnValue(errAsync(repoError))

    const useCase = createDeleteTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
    expect(taskRepo.delete).not.toHaveBeenCalled()
  })

  it('returns Err when task delete fails', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))
    vi.mocked(assigneeRepo.deleteByTask).mockReturnValue(okAsync(undefined))
    vi.mocked(taskRepo.delete).mockReturnValue(errAsync(repoError))

    const useCase = createDeleteTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', taskId: 'task-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
