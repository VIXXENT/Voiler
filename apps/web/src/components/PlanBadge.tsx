import { Badge } from '~/components/ui/badge'
import { useTranslation } from '~/lib/i18n'

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
  const { t } = useTranslation()

  const variantMap: Record<'free' | 'pro', 'outline' | 'default'> = {
    free: 'outline',
    pro: 'default',
  }

  const textMap: Record<'free' | 'pro', string> = {
    free: t({ key: 'billing.plan.free' }),
    pro: t({ key: 'billing.plan.pro' }),
  }

  return <Badge variant={variantMap[plan]}>{textMap[plan]}</Badge>
}

export { PlanBadge }
