import { Badge } from '~/components/ui/badge'
import { useTranslation } from '~/lib/i18n'

/** Props for the TaskPriorityBadge component. */
interface TaskPriorityBadgeProps {
  readonly priority: 'low' | 'medium' | 'high'
}

/**
 * Badge for task priority.
 * - low → outline variant
 * - medium → secondary
 * - high → destructive
 */
const TaskPriorityBadge = ({ priority }: TaskPriorityBadgeProps) => {
  const { t } = useTranslation()

  const variantMap: Record<'low' | 'medium' | 'high', 'outline' | 'secondary' | 'destructive'> = {
    low: 'outline',
    medium: 'secondary',
    high: 'destructive',
  }

  const textMap: Record<'low' | 'medium' | 'high', string> = {
    low: t({ key: 'tasks.priority.low' }),
    medium: t({ key: 'tasks.priority.medium' }),
    high: t({ key: 'tasks.priority.high' }),
  }

  return <Badge variant={variantMap[priority]}>{textMap[priority]}</Badge>
}

export { TaskPriorityBadge }
