import type {
  AppError,
  IProjectRepository,
  IUserSubscriptionRepository,
  ProjectRecord,
  SubscriptionRecord,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createHandleStripeWebhook } from '../../../use-cases/subscription/handle-stripe-webhook'

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

/** Builds a mock IUserSubscriptionRepository with vi.fn() stubs. */
const makeMockSubRepo = (): IUserSubscriptionRepository => ({
  findByUser: vi.fn(),
  upsert: vi.fn(),
  updateStatus: vi.fn(),
  updateStripeData: vi.fn(),
})

/** Builds a mock IProjectRepository with vi.fn() stubs. */
const makeMockProjectRepo = (): IProjectRepository => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByOwner: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  countByOwner: vi.fn(),
  deleteWithCascade: vi.fn(),
})

describe('handleStripeWebhook use case', () => {
  describe('checkout.session.completed', () => {
    it('upgrades plan to pro and unfreezes projects', async () => {
      const fakeSub = makeFakeSubscription()
      const proj = makeFakeProject('proj-1')
      const subRepo = makeMockSubRepo()
      const projectRepo = makeMockProjectRepo()

      vi.mocked(subRepo.upsert).mockReturnValue(okAsync(fakeSub))
      vi.mocked(projectRepo.findByOwner).mockReturnValue(okAsync([proj]))
      vi.mocked(projectRepo.update).mockReturnValue(okAsync({ ...proj, frozen: false }))

      const useCase = createHandleStripeWebhook({
        subscriptionRepository: subRepo,
        projectRepository: projectRepo,
      })
      const result = await useCase({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user-1', plan: 'pro' },
          },
        },
      })

      expect(result.isOk()).toBe(true)
      expect(subRepo.upsert).toHaveBeenCalledOnce()
      expect(projectRepo.update).toHaveBeenCalledOnce()
    })

    it('returns okAsync when metadata is missing userId', async () => {
      const subRepo = makeMockSubRepo()
      const projectRepo = makeMockProjectRepo()

      const useCase = createHandleStripeWebhook({
        subscriptionRepository: subRepo,
        projectRepository: projectRepo,
      })
      const result = await useCase({
        type: 'checkout.session.completed',
        data: { object: { metadata: {} } },
      })

      expect(result.isOk()).toBe(true)
      expect(subRepo.upsert).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.deleted', () => {
    it('cancels subscription and freezes projects', async () => {
      const fakeSub = makeFakeSubscription()
      const proj = makeFakeProject('proj-1')
      const subRepo = makeMockSubRepo()
      const projectRepo = makeMockProjectRepo()

      vi.mocked(subRepo.updateStatus).mockReturnValue(okAsync({ ...fakeSub, status: 'canceled' }))
      vi.mocked(projectRepo.findByOwner).mockReturnValue(okAsync([proj]))
      vi.mocked(projectRepo.update).mockReturnValue(okAsync({ ...proj, frozen: true }))

      const useCase = createHandleStripeWebhook({
        subscriptionRepository: subRepo,
        projectRepository: projectRepo,
      })
      const result = await useCase({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            metadata: { userId: 'user-1' },
          },
        },
      })

      expect(result.isOk()).toBe(true)
      expect(subRepo.updateStatus).toHaveBeenCalledOnce()
      expect(projectRepo.update).toHaveBeenCalledOnce()
    })

    it('returns okAsync when metadata userId is missing', async () => {
      const subRepo = makeMockSubRepo()
      const projectRepo = makeMockProjectRepo()

      const useCase = createHandleStripeWebhook({
        subscriptionRepository: subRepo,
        projectRepository: projectRepo,
      })
      const result = await useCase({
        type: 'customer.subscription.deleted',
        data: { object: { metadata: {} } },
      })

      expect(result.isOk()).toBe(true)
      expect(subRepo.updateStatus).not.toHaveBeenCalled()
    })
  })

  describe('unknown event type', () => {
    it('ignores the event and returns okAsync', async () => {
      const subRepo = makeMockSubRepo()
      const projectRepo = makeMockProjectRepo()

      const useCase = createHandleStripeWebhook({
        subscriptionRepository: subRepo,
        projectRepository: projectRepo,
      })
      const result = await useCase({
        type: 'invoice.payment_succeeded',
        data: { object: {} },
      })

      expect(result.isOk()).toBe(true)
      expect(subRepo.upsert).not.toHaveBeenCalled()
      expect(subRepo.updateStatus).not.toHaveBeenCalled()
    })
  })

  it('returns Err when upsert fails on checkout.session.completed', async () => {
    const subRepo = makeMockSubRepo()
    const projectRepo = makeMockProjectRepo()
    const repoError: AppError = infrastructureError({ message: 'db error' })

    vi.mocked(subRepo.upsert).mockReturnValue(errAsync(repoError))

    const useCase = createHandleStripeWebhook({
      subscriptionRepository: subRepo,
      projectRepository: projectRepo,
    })
    const result = await useCase({
      type: 'checkout.session.completed',
      data: { object: { metadata: { userId: 'user-1', plan: 'pro' } } },
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
