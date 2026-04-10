import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ProjectRecord,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createListUserProjects } from '../../../use-cases/project/list-user-projects'

/** Builds a fake ProjectRecord for test assertions. */
const makeFakeProject = (overrides?: Partial<ProjectRecord>): ProjectRecord => ({
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
  ...overrides,
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

describe('listUserProjects use case', () => {
  it('returns Ok(ProjectRecord[]) with all owned projects', async () => {
    const projects = [
      makeFakeProject({ id: 'proj-1' }),
      makeFakeProject({ id: 'proj-2', name: 'Second Project' }),
    ]
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(repo.findByOwner).mockReturnValue(okAsync(projects))
    vi.mocked(memberRepo.findProjectIdsByUser).mockReturnValue(okAsync([]))

    const useCase = createListUserProjects({
      projectRepository: repo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      const [first, second] = result.value
      expect(result.value).toHaveLength(2)
      expect(first?.id).toBe('proj-1')
      expect(second?.id).toBe('proj-2')
    }
    expect(repo.findByOwner).toHaveBeenCalledWith({ ownerId: 'user-1' })
  })

  it('returns Ok([]) when user has no projects', async () => {
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()
    vi.mocked(repo.findByOwner).mockReturnValue(okAsync([]))
    vi.mocked(memberRepo.findProjectIdsByUser).mockReturnValue(okAsync([]))

    const useCase = createListUserProjects({
      projectRepository: repo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(0)
    }
  })

  it('returns Err when repository findByOwner fails', async () => {
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(repo.findByOwner).mockReturnValue(errAsync(repoError))
    vi.mocked(memberRepo.findProjectIdsByUser).mockReturnValue(okAsync([]))

    const useCase = createListUserProjects({
      projectRepository: repo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })

  it('returns owned projects combined with member projects', async () => {
    const ownedProject = makeFakeProject({ id: 'proj-owned', ownerId: 'user-1' })
    const memberProject = makeFakeProject({ id: 'proj-member', ownerId: 'user-2' })
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()

    vi.mocked(repo.findByOwner).mockReturnValue(okAsync([ownedProject]))
    vi.mocked(memberRepo.findProjectIdsByUser).mockReturnValue(okAsync(['proj-member']))
    vi.mocked(repo.findById).mockReturnValue(okAsync(memberProject))

    const useCase = createListUserProjects({
      projectRepository: repo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(2)
      const ids = result.value.map((p) => p.id)
      expect(ids).toContain('proj-owned')
      expect(ids).toContain('proj-member')
    }
  })

  it('deduplicates if user is both owner and member of the same project', async () => {
    const project = makeFakeProject({ id: 'proj-1', ownerId: 'user-1' })
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()

    vi.mocked(repo.findByOwner).mockReturnValue(okAsync([project]))
    vi.mocked(memberRepo.findProjectIdsByUser).mockReturnValue(okAsync(['proj-1']))
    vi.mocked(repo.findById).mockReturnValue(okAsync(project))

    const useCase = createListUserProjects({
      projectRepository: repo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]?.id).toBe('proj-1')
    }
  })

  it('returns only owned projects when user has no memberships', async () => {
    const ownedProject = makeFakeProject({ id: 'proj-1' })
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()

    vi.mocked(repo.findByOwner).mockReturnValue(okAsync([ownedProject]))
    vi.mocked(memberRepo.findProjectIdsByUser).mockReturnValue(okAsync([]))

    const useCase = createListUserProjects({
      projectRepository: repo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]?.id).toBe('proj-1')
    }
    expect(repo.findById).not.toHaveBeenCalled()
  })

  it('returns only member projects when user owns no projects', async () => {
    const memberProject = makeFakeProject({ id: 'proj-member', ownerId: 'user-2' })
    const repo = makeMockRepo()
    const memberRepo = makeMockMemberRepo()

    vi.mocked(repo.findByOwner).mockReturnValue(okAsync([]))
    vi.mocked(memberRepo.findProjectIdsByUser).mockReturnValue(okAsync(['proj-member']))
    vi.mocked(repo.findById).mockReturnValue(okAsync(memberProject))

    const useCase = createListUserProjects({
      projectRepository: repo,
      memberRepository: memberRepo,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]?.id).toBe('proj-member')
    }
  })
})
