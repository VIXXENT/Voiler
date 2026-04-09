import type { AppError, IProjectRepository, ProjectRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createCreateProject } from '../../../use-cases/project/create-project'

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

describe('createProject use case', () => {
  it('returns Ok(ProjectRecord) on happy path', async () => {
    const fakeProject = makeFakeProject()
    const repo = makeMockRepo()
    vi.mocked(repo.create).mockReturnValue(okAsync(fakeProject))

    const useCase = createCreateProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', name: 'Test Project' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.name).toBe('Test Project')
      expect(result.value.ownerId).toBe('user-1')
    }
    expect(repo.create).toHaveBeenCalledOnce()
  })

  it('passes description when provided', async () => {
    const fakeProject = { ...makeFakeProject(), description: 'A description' }
    const repo = makeMockRepo()
    vi.mocked(repo.create).mockReturnValue(okAsync(fakeProject))

    const useCase = createCreateProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', name: 'Test Project', description: 'A description' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.description).toBe('A description')
    }
    expect(repo.create).toHaveBeenCalledOnce()
  })

  it('returns Err(InvalidProjectName) when name is empty', async () => {
    const repo = makeMockRepo()

    const useCase = createCreateProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', name: '   ' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidProjectName')
    }
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('returns Err(InvalidProjectName) when name exceeds 100 chars', async () => {
    const repo = makeMockRepo()

    const useCase = createCreateProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', name: 'a'.repeat(101) })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidProjectName')
    }
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('returns Err when repository create fails', async () => {
    const repo = makeMockRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(repo.create).mockReturnValue(errAsync(repoError))

    const useCase = createCreateProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', name: 'Test Project' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
