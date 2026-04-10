import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ITaskAssigneeRepository,
  ITaskRepository,
  ProjectRecord,
  TaskAssigneeRecord,
  TaskRecord,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createAssignToTask } from '../../../use-cases/task/assign-to-task'

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

/** Builds a fake TaskAssigneeRecord for test assertions. */
const makeFakeAssignee = (): TaskAssigneeRecord => ({
  id: 'assignee-1',
  taskId: 'task-1',
  userId: 'user-2',
  role: 'responsible',
  assignedAt: new Date('2026-01-01'),
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
})

/** Builds a fake project membership record for the target user. */
const makeFakeTargetMembership = ({ userId }: { userId: string }) => ({
  id: `m-${userId}`,
  projectId: 'proj-1',
  userId,
  role: 'member' as const,
  joinedAt: new Date('2026-01-01'),
})

describe('assignToTask use case', () => {
  it('assigns a collaborator without responsible check (owner)', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const fakeAssignee = { ...makeFakeAssignee(), role: 'collaborator' as const, userId: 'user-2' }
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    // 1st call: caller membership check (owner → null is ok); 2nd call: target membership check
    vi.mocked(memberRepo.findMembership)
      .mockReturnValueOnce(okAsync(null))
      .mockReturnValueOnce(okAsync(makeFakeTargetMembership({ userId: 'user-2' })))
    vi.mocked(assigneeRepo.assign).mockReturnValue(okAsync(fakeAssignee))

    const useCase = createAssignToTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      taskId: 'task-1',
      targetUserId: 'user-2',
      role: 'collaborator',
    })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.role).toBe('collaborator')
    }
    expect(assigneeRepo.findResponsible).not.toHaveBeenCalled()
    expect(assigneeRepo.assign).toHaveBeenCalledOnce()
  })

  it('assigns responsible when no existing responsible', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const fakeAssignee = makeFakeAssignee()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    // 1st call: caller membership check (owner → null is ok); 2nd call: target membership check
    vi.mocked(memberRepo.findMembership)
      .mockReturnValueOnce(okAsync(null))
      .mockReturnValueOnce(okAsync(makeFakeTargetMembership({ userId: 'user-2' })))
    vi.mocked(assigneeRepo.findResponsible).mockReturnValue(okAsync(null))
    vi.mocked(assigneeRepo.assign).mockReturnValue(okAsync(fakeAssignee))

    const useCase = createAssignToTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      taskId: 'task-1',
      targetUserId: 'user-2',
      role: 'responsible',
    })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.role).toBe('responsible')
    }
    expect(assigneeRepo.findResponsible).toHaveBeenCalledOnce()
    expect(assigneeRepo.assign).toHaveBeenCalledOnce()
  })

  it('allows reassigning the same responsible user (idempotent)', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const existingResponsible = makeFakeAssignee()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    // 1st call: caller membership check (owner → null is ok); 2nd call: target membership check
    vi.mocked(memberRepo.findMembership)
      .mockReturnValueOnce(okAsync(null))
      .mockReturnValueOnce(okAsync(makeFakeTargetMembership({ userId: 'user-2' })))
    vi.mocked(assigneeRepo.findResponsible).mockReturnValue(okAsync(existingResponsible))
    vi.mocked(assigneeRepo.assign).mockReturnValue(okAsync(existingResponsible))

    const useCase = createAssignToTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      taskId: 'task-1',
      targetUserId: 'user-2',
      role: 'responsible',
    })

    expect(result.isOk()).toBe(true)
    expect(assigneeRepo.assign).toHaveBeenCalledOnce()
  })

  it('returns Err(InvalidAssignment) when different responsible already assigned', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const existingResponsible = makeFakeAssignee()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    // 1st call: caller membership check (owner → null is ok); 2nd call: target membership check
    vi.mocked(memberRepo.findMembership)
      .mockReturnValueOnce(okAsync(null))
      .mockReturnValueOnce(okAsync(makeFakeTargetMembership({ userId: 'user-3' })))
    vi.mocked(assigneeRepo.findResponsible).mockReturnValue(okAsync(existingResponsible))

    const useCase = createAssignToTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      taskId: 'task-1',
      targetUserId: 'user-3',
      role: 'responsible',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidAssignment')
    }
    expect(assigneeRepo.assign).not.toHaveBeenCalled()
  })

  it('returns Err(TaskNotFound) when task does not exist', async () => {
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createAssignToTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      taskId: 'task-1',
      targetUserId: 'user-2',
      role: 'collaborator',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('TaskNotFound')
    }
    expect(assigneeRepo.assign).not.toHaveBeenCalled()
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

    const useCase = createAssignToTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({
      userId: 'user-99',
      taskId: 'task-1',
      targetUserId: 'user-2',
      role: 'collaborator',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('NotAMember')
    }
    expect(assigneeRepo.assign).not.toHaveBeenCalled()
  })

  it('returns Err(NotAMember) when targetUserId is not a project member', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    // 1st call: caller membership check (owner → null is ok); 2nd call: target membership check → null (not a member)
    vi.mocked(memberRepo.findMembership)
      .mockReturnValueOnce(okAsync(null))
      .mockReturnValueOnce(okAsync(null))

    const useCase = createAssignToTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      taskId: 'task-1',
      targetUserId: 'user-99',
      role: 'collaborator',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('NotAMember')
    }
    expect(assigneeRepo.assign).not.toHaveBeenCalled()
  })

  it('returns Err(InsufficientPermission) when viewer tries to assign', async () => {
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

    const useCase = createAssignToTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({
      userId: 'user-2',
      taskId: 'task-1',
      targetUserId: 'user-3',
      role: 'collaborator',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
    expect(assigneeRepo.assign).not.toHaveBeenCalled()
  })

  it('returns Err when assign repository call fails', async () => {
    const fakeTask = makeFakeTask()
    const fakeProject = makeFakeProject()
    const taskRepo = makeMockTaskRepo()
    const assigneeRepo = makeMockAssigneeRepo()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(taskRepo.findById).mockReturnValue(okAsync(fakeTask))
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(fakeProject))
    // 1st call: caller membership check (owner → null is ok); 2nd call: target membership check
    vi.mocked(memberRepo.findMembership)
      .mockReturnValueOnce(okAsync(null))
      .mockReturnValueOnce(okAsync(makeFakeTargetMembership({ userId: 'user-2' })))
    vi.mocked(assigneeRepo.assign).mockReturnValue(errAsync(repoError))

    const useCase = createAssignToTask({
      taskRepository: taskRepo,
      taskAssigneeRepository: assigneeRepo,
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      taskId: 'task-1',
      targetUserId: 'user-2',
      role: 'reviewer',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
