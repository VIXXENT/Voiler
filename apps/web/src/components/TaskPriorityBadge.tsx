import { Badge } from '~/components/ui/badge'

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
  const variantMap: Record<'low' | 'medium' | 'high', 'outline' | 'secondary' | 'destructive'> = {
    low: 'outline',
    medium: 'secondary',
    high: 'destructive',
  }

  const textMap: Record<'low' | 'medium' | 'high', string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  }

  return <Badge variant={variantMap[priority]}>{textMap[priority]}</Badge>
}

export { TaskPriorityBadge }
