import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ProjectRecord,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createGetProject } from '../../../use-cases/project/get-project'

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
const makeMockRepo = (): IProjectRepository => ({
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

describe('getProject use case', () => {
  it('returns Ok(ProjectRecord) when owner requests their project', async () => {
    const fakeProject = makeFakeProject()
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(repo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))

    const useCase = createGetProject({ projectRepository: repo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toEqual(fakeProject)
    }
    expect(repo.findById).toHaveBeenCalledWith({ id: 'proj-1' })
  })

  it('returns Ok(ProjectRecord) when a member requests the project', async () => {
    const fakeProject = makeFakeProject()
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(repo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(
      okAsync({
        id: 'm-1',
        projectId: 'proj-1',
        userId: 'user-2',
        role: 'member',
        joinedAt: new Date(),
      }),
    )

    const useCase = createGetProject({ projectRepository: repo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-2', projectId: 'proj-1' })

    expect(result.isOk()).toBe(true)
  })

  it('returns Ok(ProjectRecord) when a viewer requests the project', async () => {
    const fakeProject = makeFakeProject()
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(repo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(
      okAsync({
        id: 'm-1',
        projectId: 'proj-1',
        userId: 'user-3',
        role: 'viewer',
        joinedAt: new Date(),
      }),
    )

    const useCase = createGetProject({ projectRepository: repo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-3', projectId: 'proj-1' })

    expect(result.isOk()).toBe(true)
  })

  it('returns Err(ProjectNotFound) when project is not found', async () => {
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(repo.findById).mockReturnValue(okAsync(null))

    const useCase = createGetProject({ projectRepository: repo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'nonexistent' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
    expect(memberRepo.findMembership).not.toHaveBeenCalled()
  })

  it('returns Err(NotAMember) when user is not owner and has no membership', async () => {
    const fakeProject = makeFakeProject()
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(repo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(memberRepo.findMembership).mockReturnValue(okAsync(null))

    const useCase = createGetProject({ projectRepository: repo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-99', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('NotAMember')
    }
  })

  it('returns Err when repository findById fails', async () => {
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(repo.findById).mockReturnValue(errAsync(repoError))

    const useCase = createGetProject({ projectRepository: repo, memberRepository: memberRepo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
