import type { AppError, IUserSubscriptionRepository, SubscriptionRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createGetSubscription } from '../../../use-cases/subscription/get-subscription'

/** Builds a fake SubscriptionRecord for test assertions. */
const makeFakeSubscription = (): SubscriptionRecord => ({
  id: 'sub-1',
  userId: 'user-1',
  plan: 'pro',
  status: 'active',
  stripeCustomerId: 'cus_abc',
  stripeSubscriptionId: 'sub_abc',
  currentPeriodEnd: new Date('2027-01-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
})

/** Builds a mock IUserSubscriptionRepository with vi.fn() stubs. */
const makeMockRepo = (): IUserSubscriptionRepository => ({
  findByUser: vi.fn(),
  upsert: vi.fn(),
  updateStatus: vi.fn(),
  updateStripeData: vi.fn(),
})

describe('getSubscription use case', () => {
  it('returns existing subscription when one exists', async () => {
    const fakeSub = makeFakeSubscription()
    const repo = makeMockRepo()
    vi.mocked(repo.findByUser).mockReturnValue(okAsync(fakeSub))

    const useCase = createGetSubscription({ subscriptionRepository: repo })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.id).toBe('sub-1')
      expect(result.value.plan).toBe('pro')
    }
    expect(repo.findByUser).toHaveBeenCalledOnce()
  })

  it('returns default free subscription when no record exists', async () => {
    const repo = makeMockRepo()
    vi.mocked(repo.findByUser).mockReturnValue(okAsync(null))

    const useCase = createGetSubscription({ subscriptionRepository: repo })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.id).toBe('')
      expect(result.value.userId).toBe('user-1')
      expect(result.value.plan).toBe('free')
      expect(result.value.status).toBe('active')
      expect(result.value.stripeCustomerId).toBeNull()
      expect(result.value.stripeSubscriptionId).toBeNull()
    }
  })

  it('returns Err when repository fails', async () => {
    const repo = makeMockRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })
    vi.mocked(repo.findByUser).mockReturnValue(errAsync(repoError))

    const useCase = createGetSubscription({ subscriptionRepository: repo })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
