import { Link } from '@tanstack/react-router'
import { CheckSquare, Users } from 'lucide-react'

import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

/** Props for the ProjectCard component. */
interface ProjectCardProps {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly status: 'active' | 'archived'
  readonly frozen: boolean
  readonly memberCount?: number
  readonly taskCount?: number
}

/**
 * Displays a project summary card with status, frozen state, and metadata.
 * Links to /projects/$projectId.
 */
const ProjectCard = ({
  id,
  name,
  description,
  status,
  frozen,
  memberCount,
  taskCount,
}: ProjectCardProps) => (
  <Link to="/projects/$projectId" params={{ projectId: id }}>
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex-1">{name}</CardTitle>
          <div className="flex gap-2">
            {status === 'archived' && <Badge variant="secondary">Archived</Badge>}
            {frozen && <Badge variant="destructive">Frozen</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <div className="flex gap-4">
          {typeof memberCount === 'number' && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {memberCount} member{memberCount === 1 ? '' : 's'}
              </span>
            </div>
          )}
          {typeof taskCount === 'number' && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CheckSquare className="h-4 w-4" />
              <span>
                {taskCount} task{taskCount === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  </Link>
)

export { ProjectCard }
