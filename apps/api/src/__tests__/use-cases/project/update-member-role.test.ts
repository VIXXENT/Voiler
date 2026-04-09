import type { IProjectMemberRepository, IProjectRepository, ProjectMemberRecord, ProjectRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createUpdateMemberRole } from '../../../use-cases/project/update-member-role'

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

describe('updateMemberRole use case', () => {
  it('returns Ok(ProjectMemberRecord) on happy path', async () => {
    const updatedMember = { ...makeFakeMember(), role: 'viewer' as const }
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(makeFakeMember()))
    vi.mocked(memberRepo.updateRole).mockReturnValue(okAsync(updatedMember))

    const useCase = createUpdateMemberRole({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', targetUserId: 'user-2', newRole: 'viewer' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.role).toBe('viewer')
    }
    expect(memberRepo.updateRole).toHaveBeenCalledOnce()
  })

  it('returns Err(ProjectNotFound) when project does not exist', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(null))

    const useCase = createUpdateMemberRole({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', targetUserId: 'user-2', newRole: 'viewer' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
    expect(memberRepo.updateRole).not.toHaveBeenCalled()
  })

  it('returns Err(InsufficientPermission) when caller is not the owner', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))

    const useCase = createUpdateMemberRole({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-99', projectId: 'proj-1', targetUserId: 'user-2', newRole: 'viewer' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
    expect(memberRepo.updateRole).not.toHaveBeenCalled()
  })

  it('returns Err(CannotRemoveOwner) when trying to change the owner role', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))

    const useCase = createUpdateMemberRole({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', targetUserId: 'user-1', newRole: 'viewer' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('CannotRemoveOwner')
    }
    expect(memberRepo.updateRole).not.toHaveBeenCalled()
  })

  it('returns Err(InvalidAssignment) when new role is invalid', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))

    const useCase = createUpdateMemberRole({ projectRepository: projectRepo, memberRepository: memberRepo })
    const invalidRole = 'admin' as 'member'
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', targetUserId: 'user-2', newRole: invalidRole })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidAssignment')
    }
    expect(memberRepo.updateRole).not.toHaveBeenCalled()
  })

  it('returns Err(MemberNotFound) when target is not a member', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(okAsync(makeFakeProject()))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))

    const useCase = createUpdateMemberRole({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', targetUserId: 'user-2', newRole: 'viewer' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('MemberNotFound')
    }
    expect(memberRepo.updateRole).not.toHaveBeenCalled()
  })

  it('propagates infrastructure errors from findById', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(projectRepo.findById).mockReturnValue(errAsync(infrastructureError({ message: 'DB error' })))

    const useCase = createUpdateMemberRole({ projectRepository: projectRepo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1', targetUserId: 'user-2', newRole: 'viewer' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
