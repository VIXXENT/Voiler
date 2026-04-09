import type { AppError, IProjectRepository, ProjectRecord } from '@voiler/core'
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

describe('listUserProjects use case', () => {
  it('returns Ok(ProjectRecord[]) with all owned projects', async () => {
    const projects = [
      makeFakeProject({ id: 'proj-1' }),
      makeFakeProject({ id: 'proj-2', name: 'Second Project' }),
    ]
    const repo = makeMockRepo()
    vi.mocked(repo.findByOwner).mockReturnValue(okAsync(projects))

    const useCase = createListUserProjects({ projectRepository: repo })
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
    vi.mocked(repo.findByOwner).mockReturnValue(okAsync([]))

    const useCase = createListUserProjects({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toHaveLength(0)
    }
  })

  it('returns Err when repository findByOwner fails', async () => {
    const repo = makeMockRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(repo.findByOwner).mockReturnValue(errAsync(repoError))

    const useCase = createListUserProjects({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
