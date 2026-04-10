import { Badge } from '~/components/ui/badge'

/** Props for the TaskStatusBadge component. */
interface TaskStatusBadgeProps {
  readonly status: 'todo' | 'in_progress' | 'done'
}

/**
 * Color-coded badge for task status.
 * - todo → secondary variant
 * - in_progress → warning variant (yellow)
 * - done → success variant (green)
 */
const TaskStatusBadge = ({ status }: TaskStatusBadgeProps) => {
  const variantMap: Record<'todo' | 'in_progress' | 'done', 'secondary' | 'warning' | 'success'> = {
    todo: 'secondary',
    in_progress: 'warning',
    done: 'success',
  }

  const textMap: Record<'todo' | 'in_progress' | 'done', string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
  }

  return <Badge variant={variantMap[status]}>{textMap[status]}</Badge>
}

export { TaskStatusBadge }
