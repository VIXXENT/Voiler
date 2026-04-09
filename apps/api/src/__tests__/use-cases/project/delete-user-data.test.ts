import type { IProjectMemberRepository, IProjectRepository, ProjectRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createDeleteUserData } from '../../../use-cases/project/delete-user-data'

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

describe('deleteUserData use case', () => {
  it('returns Ok(void) and deletes memberships and owned projects', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(memberRepo.deleteByUser).mockReturnValue(okAsync(undefined))
    vi.mocked(projectRepo.findByOwner).mockReturnValue(okAsync([makeFakeProject()]))
    vi.mocked(projectRepo.deleteWithCascade).mockReturnValue(okAsync(undefined))

    const useCase = createDeleteUserData({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    expect(memberRepo.deleteByUser).toHaveBeenCalledOnce()
    expect(projectRepo.findByOwner).toHaveBeenCalledOnce()
    expect(projectRepo.deleteWithCascade).toHaveBeenCalledOnce()
  })

  it('returns Ok(void) when user has no owned projects', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(memberRepo.deleteByUser).mockReturnValue(okAsync(undefined))
    vi.mocked(projectRepo.findByOwner).mockReturnValue(okAsync([]))

    const useCase = createDeleteUserData({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    expect(memberRepo.deleteByUser).toHaveBeenCalledOnce()
    expect(projectRepo.deleteWithCascade).not.toHaveBeenCalled()
  })

  it('deletes multiple owned projects in parallel', async () => {
    const project2 = { ...makeFakeProject(), id: 'proj-2' }
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(memberRepo.deleteByUser).mockReturnValue(okAsync(undefined))
    vi.mocked(projectRepo.findByOwner).mockReturnValue(okAsync([makeFakeProject(), project2]))
    vi.mocked(projectRepo.deleteWithCascade).mockReturnValue(okAsync(undefined))

    const useCase = createDeleteUserData({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    expect(projectRepo.deleteWithCascade).toHaveBeenCalledTimes(2)
  })

  it('propagates infrastructure errors from deleteByUser', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(memberRepo.deleteByUser).mockReturnValue(
      errAsync(infrastructureError({ message: 'DB error' })),
    )

    const useCase = createDeleteUserData({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
    expect(projectRepo.findByOwner).not.toHaveBeenCalled()
  })

  it('propagates infrastructure errors from findByOwner', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(memberRepo.deleteByUser).mockReturnValue(okAsync(undefined))
    vi.mocked(projectRepo.findByOwner).mockReturnValue(
      errAsync(infrastructureError({ message: 'DB error' })),
    )

    const useCase = createDeleteUserData({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
    expect(projectRepo.deleteWithCascade).not.toHaveBeenCalled()
  })

  it('propagates infrastructure errors from deleteWithCascade', async () => {
    const projectRepo = makeMockProjectRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(memberRepo.deleteByUser).mockReturnValue(okAsync(undefined))
    vi.mocked(projectRepo.findByOwner).mockReturnValue(okAsync([makeFakeProject()]))
    vi.mocked(projectRepo.deleteWithCascade).mockReturnValue(
      errAsync(infrastructureError({ message: 'DB error' })),
    )

    const useCase = createDeleteUserData({
      projectRepository: projectRepo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
