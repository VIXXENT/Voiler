import type { AppError, IProjectRepository, ProjectRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createArchiveProject } from '../../../use-cases/project/archive-project'

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

describe('archiveProject use case', () => {
  it('returns Ok(ProjectRecord) with archived status on happy path', async () => {
    const fakeProject = makeFakeProject()
    const archivedProject = makeFakeProject({ status: 'archived' })
    const repo = makeMockRepo()
    vi.mocked(repo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(repo.update).mockReturnValue(okAsync(archivedProject))

    const useCase = createArchiveProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.status).toBe('archived')
    }
    expect(repo.update).toHaveBeenCalledOnce()
  })

  it('returns Err(ProjectNotFound) when project does not exist', async () => {
    const repo = makeMockRepo()
    vi.mocked(repo.findById).mockReturnValue(okAsync(null))

    const useCase = createArchiveProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', projectId: 'nonexistent' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('returns Err(InsufficientPermission) when caller is not the owner', async () => {
    const fakeProject = makeFakeProject({ ownerId: 'other-user' })
    const repo = makeMockRepo()
    vi.mocked(repo.findById).mockReturnValue(okAsync(fakeProject))

    const useCase = createArchiveProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('returns Err when repository findById fails', async () => {
    const repo = makeMockRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(repo.findById).mockReturnValue(errAsync(repoError))

    const useCase = createArchiveProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })

  it('returns Err when repository update fails', async () => {
    const fakeProject = makeFakeProject()
    const repo = makeMockRepo()
    const repoError: AppError = infrastructureError({ message: 'update failed' })
    vi.mocked(repo.findById).mockReturnValue(okAsync(fakeProject))
    vi.mocked(repo.update).mockReturnValue(errAsync(repoError))

    const useCase = createArchiveProject({ projectRepository: repo })
    const result = await useCase({ userId: 'user-1', projectId: 'proj-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
