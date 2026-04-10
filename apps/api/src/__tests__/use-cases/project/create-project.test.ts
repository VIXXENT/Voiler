import type { AppError, IProjectRepository, IUserSubscriptionRepository, ProjectRecord } from '@voiler/core'
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

/** Builds a mock IUserSubscriptionRepository with vi.fn() stubs. */
const makeMockSubscriptionRepo = (): IUserSubscriptionRepository => ({
  findByUser: vi.fn(),
  upsert: vi.fn(),
  updateStatus: vi.fn(),
  updateStripeData: vi.fn(),
})

describe('createProject use case', () => {
  it('returns Ok(ProjectRecord) on happy path', async () => {
    const fakeProject = makeFakeProject()
    const repo = makeMockRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(subRepo.findByUser).mockReturnValue(okAsync(null))
    vi.mocked(repo.countByOwner).mockReturnValue(okAsync(0))
    vi.mocked(repo.create).mockReturnValue(okAsync(fakeProject))

    const useCase = createCreateProject({ projectRepository: repo, subscriptionRepository: subRepo })
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
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(subRepo.findByUser).mockReturnValue(okAsync(null))
    vi.mocked(repo.countByOwner).mockReturnValue(okAsync(0))
    vi.mocked(repo.create).mockReturnValue(okAsync(fakeProject))

    const useCase = createCreateProject({ projectRepository: repo, subscriptionRepository: subRepo })
    const result = await useCase({
      userId: 'user-1',
      name: 'Test Project',
      description: 'A description',
    })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.description).toBe('A description')
    }
    expect(repo.create).toHaveBeenCalledOnce()
  })

  it('returns Err(InvalidProjectName) when name is empty', async () => {
    const repo = makeMockRepo()
    const subRepo = makeMockSubscriptionRepo()

    const useCase = createCreateProject({ projectRepository: repo, subscriptionRepository: subRepo })
    const result = await useCase({ userId: 'user-1', name: '   ' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidProjectName')
    }
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('returns Err(InvalidProjectName) when name exceeds 100 chars', async () => {
    const repo = makeMockRepo()
    const subRepo = makeMockSubscriptionRepo()

    const useCase = createCreateProject({ projectRepository: repo, subscriptionRepository: subRepo })
    const result = await useCase({ userId: 'user-1', name: 'a'.repeat(101) })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InvalidProjectName')
    }
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('returns Err(ProjectLimitReached) when user has reached project limit', async () => {
    const repo = makeMockRepo()
    const subRepo = makeMockSubscriptionRepo()
    vi.mocked(subRepo.findByUser).mockReturnValue(
      okAsync({
        id: 'sub-1',
        userId: 'user-1',
        plan: 'free',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      }),
    )
    vi.mocked(repo.countByOwner).mockReturnValue(okAsync(3))

    const useCase = createCreateProject({ projectRepository: repo, subscriptionRepository: subRepo })
    const result = await useCase({ userId: 'user-1', name: 'Test Project' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('ProjectLimitReached')
    }
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('returns Err when repository create fails', async () => {
    const repo = makeMockRepo()
    const subRepo = makeMockSubscriptionRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(subRepo.findByUser).mockReturnValue(okAsync(null))
    vi.mocked(repo.countByOwner).mockReturnValue(okAsync(0))
    vi.mocked(repo.create).mockReturnValue(errAsync(repoError))

    const useCase = createCreateProject({ projectRepository: repo, subscriptionRepository: subRepo })
    const result = await useCase({ userId: 'user-1', name: 'Test Project' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
