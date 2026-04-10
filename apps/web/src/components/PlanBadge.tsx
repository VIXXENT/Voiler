import { Badge } from '~/components/ui/badge'

/** Props for the PlanBadge component. */
interface PlanBadgeProps {
  readonly plan: 'free' | 'pro'
}

/**
 * Shows current subscription plan.
 * - free → outline variant
 * - pro → default variant (primary)
 */
const PlanBadge = ({ plan }: PlanBadgeProps) => {
  const variantMap: Record<'free' | 'pro', 'outline' | 'default'> = {
    free: 'outline',
    pro: 'default',
  }

  const textMap: Record<'free' | 'pro', string> = {
    free: 'Free Plan',
    pro: 'Pro Plan',
  }

  return <Badge variant={variantMap[plan]}>{textMap[plan]}</Badge>
}

export { PlanBadge }
