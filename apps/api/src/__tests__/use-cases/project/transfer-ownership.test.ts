import type { IProjectMemberRepository, IProjectRepository, ProjectMemberRecord, ProjectRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createTransferOwnership } from '../../../use-cases/project/transfer-ownership'

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

describe('transferOwnership use case', () => {
  it('returns Ok(ProjectRecord) with new owner on happy path', async () => {
    const updatedProject = { ...makeFakeProject(), ownerId: 'user-2' }
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(makeFakeMember()))
    vi.mocked(memberRepo.removeMember).mockReturnValue(okAsync(undefined))
    vi.mocked(memberRepo.addMember).mockReturnValue(okAsync(makeFakeMember()))
    vi.mocked(projectRepo.update).mockReturnValue(okAsync(updatedProject))

    const useCase = createTransferOwnership({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', newOwnerId: 'user-2' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.ownerId).toBe('user-2')
    }
    expect(memberRepo.removeMember).toHaveBeenCalledOnce()
    expect(memberRepo.addMember).toHaveBeenCalledOnce()
    expect(projectRepo.update).toHaveBeenCalledOnce()
  })

  it('returns Err(ProjectNotFound) when project does not exist', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createTransferOwnership({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', newOwnerId: 'user-2' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
    expect(projectRepo.update).not.toHaveBeenCalled()
  })

  it('returns Err(InsufficientPermission) when caller is not the owner', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))

    const useCase = createTransferOwnership({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-99', projectId: 'proj-1', newOwnerId: 'user-2' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
    expect(projectRepo.update).not.toHaveBeenCalled()
  })

  it('returns Err(MemberNotFound) when new owner is not a current member', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))

    const useCase = createTransferOwnership({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', newOwnerId: 'user-2' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('MemberNotFound')
    }
    expect(projectRepo.update).not.toHaveBeenCalled()
  })

  it('propagates infrastructure errors from removeMember', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(makeFakeMember()))
    vi.mocked(memberRepo.removeMember).mockReturnValue(errAsync(infrastructureError({ message: 'DB error' })))

    const useCase = createTransferOwnership({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', newOwnerId: 'user-2' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
    expect(projectRepo.update).not.toHaveBeenCalled()
  })
})
