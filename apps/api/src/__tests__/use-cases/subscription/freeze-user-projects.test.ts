import type { AppError, IProjectRepository, ProjectRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createFreezeUserProjects } from '../../../use-cases/subscription/freeze-user-projects'

/** Builds a fake ProjectRecord for test assertions. */
const makeFakeProject = (id: string): ProjectRecord => ({
  id,
  name: `Project ${id}`,
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

describe('freezeUserProjects use case', () => {
  it('updates all owned projects to frozen=true', async () => {
    const proj1 = makeFakeProject('proj-1')
    const proj2 = makeFakeProject('proj-2')
    const repo = makeMockRepo()
    vi.mocked(repo.findByOwner).mockReturnValue(okAsync([proj1, proj2]))
    vi.mocked(repo.update).mockReturnValue(okAsync({ ...proj1, frozen: true }))

    const useCase = createFreezeUserProjects({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    expect(repo.findByOwner).toHaveBeenCalledOnce()
    expect(repo.update).toHaveBeenCalledTimes(2)
  })

  it('succeeds immediately when user has no projects', async () => {
    const repo = makeMockRepo()
    vi.mocked(repo.findByOwner).mockReturnValue(okAsync([]))

    const useCase = createFreezeUserProjects({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('returns Err when repository findByOwner fails', async () => {
    const repo = makeMockRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(repo.findByOwner).mockReturnValue(errAsync(repoError))

    const useCase = createFreezeUserProjects({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
