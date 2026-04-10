import type {
  IProjectMemberRepository,
  IProjectRepository,
  ProjectMemberRecord,
  ProjectRecord,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createListProjectMembers } from '../../../use-cases/project/list-project-members'

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
  findProjectIdsByUser: vi.fn(),
})

describe('listProjectMembers use case', () => {
  it('returns Ok(members) when caller is the owner', async () => {
    const fakeMember = makeFakeMember()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(memberRepo.findByProject).mockReturnValue(okAsync([fakeMember]))

    const useCase = createListProjectMembers({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]?.userId).toBe('user-2')
    }
    expect(memberRepo.findByProject).toHaveBeenCalledOnce()
  })

  it('returns Ok(members) when caller is a member', async () => {
    const fakeMember = makeFakeMember()
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(fakeMember))
    vi.mocked(memberRepo.findByProject).mockReturnValue(okAsync([fakeMember]))

    const useCase = createListProjectMembers({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-2', projectId: 'proj-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(1)
    }
    expect(memberRepo.findByProject).toHaveBeenCalledOnce()
  })

  it('returns Err(ProjectNotFound) when project does not exist', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createListProjectMembers({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
    expect(memberRepo.findByProject).not.toHaveBeenCalled()
  })

  it('returns Err(NotAMember) when caller is not owner and has no membership', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))

    const useCase = createListProjectMembers({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-99', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('NotAMember')
    }
    expect(memberRepo.findByProject).not.toHaveBeenCalled()
  })

  it('propagates infrastructure errors from findById', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(
      errAsync(infrastructureError({ message: 'DB error' })),
    )

    const useCase = createListProjectMembers({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
