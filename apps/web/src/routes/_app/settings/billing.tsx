import { createFileRoute } from '@tanstack/react-router'

/** Billing page — stub for M4-T5. */
const BillingPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">Billing</h1>
    <p className="mt-2 text-muted-foreground">Billing and subscription details will appear here.</p>
  </div>
)

const Route = createFileRoute('/_app/settings/billing')({
  component: BillingPage,
})

export { Route }
