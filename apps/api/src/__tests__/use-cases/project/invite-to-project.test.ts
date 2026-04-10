import type {
  IProjectMemberRepository,
  IProjectRepository,
  IUserSubscriptionRepository,
  ProjectMemberRecord,
  ProjectRecord,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createInviteToProject } from '../../../use-cases/project/invite-to-project'

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

/** Builds a fake ProjectMemberRecord for test assertions. */
const makeFakeMember = (): ProjectMemberRecord => ({
  id: 'member-1',
  projectId: 'proj-1',
  userId: 'user-2',
  role: 'member',
  joinedAt: new Date('2026-01-01'),
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

/** Builds a mock IUserSubscriptionRepository with vi.fn() stubs. */
const makeMockSubscriptionRepo = (): IUserSubscriptionRepository => ({
  findByUser: vi.fn(),
  upsert: vi.fn(),
  updateStatus: vi.fn(),
  updateStripeData: vi.fn(),
})

describe('inviteToProject use case', () => {
  it('returns Ok(ProjectMemberRecord) on happy path', async () => {
    const fakeMember = makeFakeMember()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(subRepo.findByUser).mockReturnValue(okAsync(null))
    vi.mocked(memberRepo.findByProject).mockReturnValue(okAsync([]))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))
    vi.mocked(memberRepo.addMember).mockReturnValue(okAsync(fakeMember))

    const useCase = createInviteToProject({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
      subscriptionRepository: subRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      projectId: 'proj-1',
      targetUserId: 'user-2',
      role: 'member',
    })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.userId).toBe('user-2')
      expect(result.value.role).toBe('member')
    }
    expect(memberRepo.addMember).toHaveBeenCalledOnce()
  })

  it('returns Err(ProjectNotFound) when project does not exist', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createInviteToProject({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
      subscriptionRepository: subRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      projectId: 'proj-1',
      targetUserId: 'user-2',
      role: 'member',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
    expect(memberRepo.addMember).not.toHaveBeenCalled()
  })

  it('returns Err(InsufficientPermission) when caller is not the owner', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))

    const useCase = createInviteToProject({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
      subscriptionRepository: subRepo,
    })
    const result = await useCase({
      userId: 'user-99',
      projectId: 'proj-1',
      targetUserId: 'user-2',
      role: 'member',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
    expect(memberRepo.addMember).not.toHaveBeenCalled()
  })

  it('returns Err(ProjectFrozen) when project is frozen', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(
      okAsync({ ...makeFakeProject(), frozen: true }),
    )

    const useCase = createInviteToProject({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
      subscriptionRepository: subRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      projectId: 'proj-1',
      targetUserId: 'user-2',
      role: 'member',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectFrozen')
    }
    expect(memberRepo.addMember).not.toHaveBeenCalled()
  })

  it('returns Err(MemberLimitReached) when member limit reached', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(subRepo.findByUser).mockReturnValue(
      okAsync({
        id: 'sub-1',
        userId: 'user-1',
        plan: 'free',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      }),
    )
    vi.mocked(memberRepo.findByProject).mockReturnValue(
      okAsync([
        { id: 'm-1', projectId: 'proj-1', userId: 'u-1', role: 'member', joinedAt: new Date() },
        { id: 'm-2', projectId: 'proj-1', userId: 'u-2', role: 'member', joinedAt: new Date() },
        { id: 'm-3', projectId: 'proj-1', userId: 'u-3', role: 'member', joinedAt: new Date() },
        { id: 'm-4', projectId: 'proj-1', userId: 'u-4', role: 'member', joinedAt: new Date() },
        { id: 'm-5', projectId: 'proj-1', userId: 'u-5', role: 'member', joinedAt: new Date() },
      ]),
    )

    const useCase = createInviteToProject({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
      subscriptionRepository: subRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      projectId: 'proj-1',
      targetUserId: 'user-2',
      role: 'member',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('MemberLimitReached')
    }
    expect(memberRepo.addMember).not.toHaveBeenCalled()
  })

  it('returns Err(AlreadyMember) when user is already a member', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(subRepo.findByUser).mockReturnValue(okAsync(null))
    vi.mocked(memberRepo.findByProject).mockReturnValue(okAsync([]))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(makeFakeMember()))

    const useCase = createInviteToProject({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
      subscriptionRepository: subRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      projectId: 'proj-1',
      targetUserId: 'user-2',
      role: 'member',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('AlreadyMember')
    }
    expect(memberRepo.addMember).not.toHaveBeenCalled()
  })

  it('returns Err(InvalidAssignment) when role is invalid', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))

    const useCase = createInviteToProject({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
      subscriptionRepository: subRepo,
    })
    const invalidRole = 'owner' as unknown as 'member'
    const result = await useCase({
      userId: 'user-1',
      projectId: 'proj-1',
      targetUserId: 'user-2',
      role: invalidRole,
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidAssignment')
    }
    expect(memberRepo.addMember).not.toHaveBeenCalled()
  })

  it('propagates infrastructure errors from findById', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(
      errAsync(infrastructureError({ message: 'DB error' })),
    )

    const useCase = createInviteToProject({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
      subscriptionRepository: subRepo,
    })
    const result = await useCase({
      userId: 'user-1',
      projectId: 'proj-1',
      targetUserId: 'user-2',
      role: 'member',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
