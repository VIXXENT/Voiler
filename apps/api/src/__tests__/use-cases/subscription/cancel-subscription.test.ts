import type {
  AppError,
  IBillingService,
  IUserSubscriptionRepository,
  SubscriptionRecord,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync, type ResultAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createCancelSubscription } from '../../../use-cases/subscription/cancel-subscription'

/** Builds a fake SubscriptionRecord for test assertions. */
const makeFakeSubscription = (overrides?: Partial<SubscriptionRecord>): SubscriptionRecord => ({
  id: 'sub-1',
  userId: 'user-1',
  plan: 'pro',
  status: 'active',
  stripeCustomerId: 'cus_abc',
  stripeSubscriptionId: 'sub_abc',
  currentPeriodEnd: new Date('2027-01-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
})

/** Builds a mock IUserSubscriptionRepository with vi.fn() stubs. */
const makeMockSubRepo = (): IUserSubscriptionRepository => ({
  findByUser: vi.fn(),
  upsert: vi.fn(),
  updateStatus: vi.fn(),
  updateStripeData: vi.fn(),
})

/** Builds a mock IBillingService with vi.fn() stubs. */
const makeMockBilling = (): IBillingService => ({
  createCheckoutSession: vi.fn(),
  cancelSubscription: vi.fn(),
  getPortalUrl: vi.fn(),
})

/** Builds a mock freezeUserProjects function. */
const makeMockFreezeUserProjects = (): ((params: {
  userId: string
}) => ResultAsync<void, AppError>) => vi.fn()

describe('cancelSubscription use case', () => {
  it('cancels stripe subscription, updates status, and freezes projects', async () => {
    const sub = makeFakeSubscription()
    const subRepo = makeMockSubRepo()
    const billing = makeMockBilling()
    const freezeUserProjects = makeMockFreezeUserProjects()

    vi.mocked(subRepo.findByUser).mockReturnValue(okAsync(sub))
    vi.mocked(billing.cancelSubscription).mockReturnValue(okAsync(undefined))
    vi.mocked(subRepo.updateStatus).mockReturnValue(okAsync({ ...sub, status: 'canceled' }))
    vi.mocked(freezeUserProjects).mockReturnValue(okAsync(undefined))

    const useCase = createCancelSubscription({
      subscriptionRepository: subRepo,
      billingService: billing,
      freezeUserProjects,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    expect(billing.cancelSubscription).toHaveBeenCalledOnce()
    expect(subRepo.updateStatus).toHaveBeenCalledOnce()
    expect(freezeUserProjects).toHaveBeenCalledOnce()
    expect(freezeUserProjects).toHaveBeenCalledWith({ userId: 'user-1' })
  })

  it('handles null stripeSubscriptionId without calling billing service', async () => {
    const sub = makeFakeSubscription({ stripeSubscriptionId: null })
    const subRepo = makeMockSubRepo()
    const billing = makeMockBilling()
    const freezeUserProjects = makeMockFreezeUserProjects()

    vi.mocked(subRepo.findByUser).mockReturnValue(okAsync(sub))
    vi.mocked(subRepo.updateStatus).mockReturnValue(okAsync({ ...sub, status: 'canceled' }))
    vi.mocked(freezeUserProjects).mockReturnValue(okAsync(undefined))

    const useCase = createCancelSubscription({
      subscriptionRepository: subRepo,
      billingService: billing,
      freezeUserProjects,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    expect(billing.cancelSubscription).not.toHaveBeenCalled()
    expect(subRepo.updateStatus).toHaveBeenCalledOnce()
    expect(freezeUserProjects).toHaveBeenCalledOnce()
  })

  it('returns okAsync immediately when no subscription exists', async () => {
    const subRepo = makeMockSubRepo()
    const billing = makeMockBilling()
    const freezeUserProjects = makeMockFreezeUserProjects()

    vi.mocked(subRepo.findByUser).mockReturnValue(okAsync(null))

    const useCase = createCancelSubscription({
      subscriptionRepository: subRepo,
      billingService: billing,
      freezeUserProjects,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isOk()).toBe(true)
    expect(billing.cancelSubscription).not.toHaveBeenCalled()
    expect(subRepo.updateStatus).not.toHaveBeenCalled()
    expect(freezeUserProjects).not.toHaveBeenCalled()
  })

  it('returns Err when repository findByUser fails', async () => {
    const subRepo = makeMockSubRepo()
    const billing = makeMockBilling()
    const freezeUserProjects = makeMockFreezeUserProjects()
    const repoError: AppError = infrastructureError({ message: 'db error' })

    vi.mocked(subRepo.findByUser).mockReturnValue(errAsync(repoError))

    const useCase = createCancelSubscription({
      subscriptionRepository: subRepo,
      billingService: billing,
      freezeUserProjects,
    })
    const result = await useCase({ userId: 'user-1' })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
