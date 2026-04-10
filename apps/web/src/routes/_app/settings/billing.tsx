/* eslint-disable
    @typescript-eslint/no-unsafe-assignment,
    @typescript-eslint/no-unsafe-call,
    @typescript-eslint/no-unsafe-member-access */
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { PlanBadge } from '~/components/PlanBadge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Skeleton } from '~/components/ui/skeleton'
import { trpc } from '~/lib/trpc'

/** Shape of a subscription row returned by the API. */
interface SubscriptionRow {
  readonly plan: 'free' | 'pro'
  readonly status: string
  readonly currentPeriodEnd: Date | null
}

/** Returns true if value is a SubscriptionRow. */
const isSubscriptionRow = (value: unknown): value is SubscriptionRow =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>)['plan'] === 'string' &&
  typeof (value as Record<string, unknown>)['status'] === 'string'

/** Billing page — shows current plan and upgrade / cancel options. */
const BillingPage = () => {
  const [cancelOpen, setCancelOpen] = useState(false)

  // @ts-expect-error — cross-package tRPC collision
  const { data, isLoading, error } = trpc.billing.getSubscription.useQuery()
  // @ts-expect-error — cross-package tRPC collision
  const utils = trpc.useUtils()
  // @ts-expect-error — cross-package tRPC collision
  const createCheckoutSession = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (result: unknown) => {
      const session = result as Record<string, unknown>
      if (typeof session['url'] === 'string') {
        window.location.href = session['url']
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    },
  })
  // @ts-expect-error — cross-package tRPC collision
  const cancelSubscription = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      setCancelOpen(false)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      void utils.billing.getSubscription.invalidate()
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    },
  })
  /* eslint-enable
      @typescript-eslint/no-unsafe-assignment,
      @typescript-eslint/no-unsafe-call,
      @typescript-eslint/no-unsafe-member-access */

  const subscription: SubscriptionRow | undefined = isSubscriptionRow(data) ? data : undefined

  const isCheckoutPending: boolean =
    typeof createCheckoutSession === 'object' &&
    createCheckoutSession !== null &&
    (createCheckoutSession as Record<string, unknown>)['isPending'] === true

  const isCancelPending: boolean =
    typeof cancelSubscription === 'object' &&
    cancelSubscription !== null &&
    (cancelSubscription as Record<string, unknown>)['isPending'] === true

  const handleUpgrade = () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    createCheckoutSession.mutate({
      plan: 'pro',
      successUrl: window.location.href,
      cancelUrl: window.location.href,
    })
  }

  const handleCancel = () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    cancelSubscription.mutate()
  }

  if (error !== null && error !== undefined) {
    return <div className="p-6 text-destructive">Failed to load subscription</div>
  }

  if (isLoading === true) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-36 w-full max-w-lg" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Billing</h1>
      <p className="text-muted-foreground mb-6">Manage your subscription and plan.</p>

      <div className="max-w-lg space-y-6">
        {/* Current plan card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Plan</CardTitle>
              {subscription !== undefined && <PlanBadge plan={subscription.plan} />}
            </div>
            <CardDescription>Your active subscription plan and billing details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription !== undefined && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{subscription.status}</span>
                </div>
                {subscription.currentPeriodEnd !== null &&
                  subscription.currentPeriodEnd !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {subscription.plan === 'pro' ? 'Renews' : 'Period ends'}
                      </span>
                      <span className="font-medium">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
              </>
            )}

            {/* Upgrade button for free plan */}
            {subscription !== undefined && subscription.plan === 'free' && (
              <div className="pt-2">
                <Button onClick={handleUpgrade} disabled={isCheckoutPending} className="w-full">
                  {isCheckoutPending ? 'Redirecting...' : 'Upgrade to Pro'}
                </Button>
              </div>
            )}

            {/* Cancel button for pro plan */}
            {subscription !== undefined && subscription.plan === 'pro' && (
              <div className="pt-2">
                <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Cancel Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Subscription</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-4">
                      Are you sure you want to cancel your Pro subscription? You will retain Pro
                      access until the end of your current billing period.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setCancelOpen(false)}>
                        Keep Plan
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={isCancelPending}
                      >
                        {isCancelPending ? 'Cancelling...' : 'Cancel Subscription'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const Route = createFileRoute('/_app/settings/billing')({
  component: BillingPage,
})

export { Route }
