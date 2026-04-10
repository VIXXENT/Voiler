import type { IUserSubscriptionRepository, SubscriptionRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { eq } from 'drizzle-orm'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import type { DbClient } from '../../db/index.js'
import { UserSubscription } from '../../db/schema.js'

type SubscriptionRow = typeof UserSubscription.$inferSelect

interface CreateDrizzleUserSubscriptionRepositoryParams {
  db: DbClient
}

const mapRowToRecord: (params: { row: SubscriptionRow }) => SubscriptionRecord = (params) => {
  const { row } = params
  const plan = row.plan === 'pro' ? row.plan : 'free'
  const status =
    row.status === 'canceled'
      ? row.status
      : row.status === 'past_due'
        ? row.status
        : 'active'
  return {
    id: row.id,
    userId: row.userId,
    plan,
    status,
    stripeCustomerId: row.stripeCustomerId ?? null,
    stripeSubscriptionId: row.stripeSubscriptionId ?? null,
    currentPeriodEnd: row.currentPeriodEnd ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Create a Drizzle-backed implementation of IUserSubscriptionRepository.
 */
const createDrizzleUserSubscriptionRepository: (
  params: CreateDrizzleUserSubscriptionRepositoryParams,
) => IUserSubscriptionRepository = (params) => {
  const { db } = params

  const findByUser: IUserSubscriptionRepository['findByUser'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(UserSubscription).where(eq(UserSubscription.userId, findParams.userId)),
      (cause) => infrastructureError({ message: 'Failed to find subscription by user', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return okAsync(null)
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const upsert: IUserSubscriptionRepository['upsert'] = (upsertParams) => {
    const { userId, data } = upsertParams
    const now = data.updatedAt
    const plan = data.plan === 'pro' ? data.plan : 'free'
    const stripeCustomerId = data.stripeCustomerId ?? null
    const stripeSubscriptionId = data.stripeSubscriptionId ?? null
    const currentPeriodEnd = data.currentPeriodEnd ?? null
    return ResultAsync.fromPromise(
      db
        .insert(UserSubscription)
        .values({
          id: crypto.randomUUID(),
          userId,
          plan,
          status: data.status,
          stripeCustomerId,
          stripeSubscriptionId,
          currentPeriodEnd,
          createdAt: new Date(),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: UserSubscription.userId,
          set: {
            plan,
            status: data.status,
            stripeCustomerId,
            stripeSubscriptionId,
            currentPeriodEnd,
            updatedAt: now,
          },
        })
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to upsert subscription', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return errAsync(infrastructureError({ message: 'Upsert returned no rows' }))
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const updateStatus: IUserSubscriptionRepository['updateStatus'] = (updateParams) => {
    return ResultAsync.fromPromise(
      db
        .update(UserSubscription)
        .set({ status: updateParams.status, updatedAt: updateParams.updatedAt })
        .where(eq(UserSubscription.userId, updateParams.userId))
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to update subscription status', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return errAsync(infrastructureError({ message: 'Update status returned no rows' }))
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const updateStripeData: IUserSubscriptionRepository['updateStripeData'] = (updateParams) => {
    const plan = updateParams.plan === 'pro' ? updateParams.plan : 'free'
    return ResultAsync.fromPromise(
      db
        .update(UserSubscription)
        .set({
          stripeCustomerId: updateParams.stripeCustomerId,
          stripeSubscriptionId: updateParams.stripeSubscriptionId,
          plan,
          status: updateParams.status,
          currentPeriodEnd: updateParams.currentPeriodEnd,
          updatedAt: updateParams.updatedAt,
        })
        .where(eq(UserSubscription.userId, updateParams.userId))
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to update Stripe data', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return errAsync(infrastructureError({ message: 'Update Stripe data returned no rows' }))
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  return {
    findByUser,
    upsert,
    updateStatus,
    updateStripeData,
  }
}

export { createDrizzleUserSubscriptionRepository }
export type { CreateDrizzleUserSubscriptionRepositoryParams }
