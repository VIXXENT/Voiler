import { infrastructureError } from '@voiler/core'
import type { IProjectRepository, ProjectRecord } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createDeleteProject } from '../../../use-cases/project/delete-project'

/** Builds a fake ProjectRecord for test assertions. */
const makeFakeProject = (overrides?: Partial<ProjectRecord>): ProjectRecord => ({
  id: 'project-1',
  name: 'Test Project',
  description: null,
  status: 'active',
  ownerId: 'user-1',
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

describe('deleteProject use case', () => {
  it('calls deleteWithCascade on happy path', async () => {
    const repo = makeMockRepo()
    const project = makeFakeProject()

    vi.mocked(repo.findById).mockReturnValue(okAsync(project))
    vi.mocked(repo.deleteWithCascade).mockReturnValue(okAsync(undefined))

    const useCase = createDeleteProject({ projectRepository: repo })
    const result = await useCase({ projectId: 'project-1', userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    expect(repo.deleteWithCascade).toHaveBeenCalledWith({ projectId: 'project-1' })
  })

  it('returns ProjectNotFound when project does not exist', async () => {
    const repo = makeMockRepo()

    vi.mocked(repo.findById).mockReturnValue(okAsync(null))

    const useCase = createDeleteProject({ projectRepository: repo })
    const result = await useCase({ projectId: 'nonexistent', userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectNotFound')
    }
  })

  it('returns InsufficientPermission when caller is not owner', async () => {
    const repo = makeMockRepo()
    const project = makeFakeProject({ ownerId: 'owner-id' })

    vi.mocked(repo.findById).mockReturnValue(okAsync(project))

    const useCase = createDeleteProject({ projectRepository: repo })
    const result = await useCase({ projectId: 'project-1', userId: 'other-user' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InsufficientPermission')
    }
  })

  it('propagates repository errors', async () => {
    const repo = makeMockRepo()
    const project = makeFakeProject()

    vi.mocked(repo.findById).mockReturnValue(okAsync(project))
    vi.mocked(repo.deleteWithCascade).mockReturnValue(
      errAsync(infrastructureError({ message: 'db error' })),
    )

    const useCase = createDeleteProject({ projectRepository: repo })
    const result = await useCase({ projectId: 'project-1', userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
