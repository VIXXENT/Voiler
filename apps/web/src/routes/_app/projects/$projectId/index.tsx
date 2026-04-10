import { createFileRoute, Link } from '@tanstack/react-router'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { TaskPriorityBadge } from '~/components/TaskPriorityBadge'
import { TaskStatusBadge } from '~/components/TaskStatusBadge'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import { Textarea } from '~/components/ui/textarea'
import { trpc } from '~/lib/trpc'

/** Shape of a task row returned by the API. */
interface TaskRow {
  readonly id: string
  readonly title: string
  readonly status: 'todo' | 'in_progress' | 'done'
  readonly priority: 'low' | 'medium' | 'high'
  readonly dueDate: Date | null
  readonly createdAt: Date
}

/** Shape of a project row returned by the API. */
interface ProjectRow {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly status: 'active' | 'archived'
  readonly frozen: boolean
}

/** Returns true if value is a TaskRow. */
const isTaskRow = (value: unknown): value is TaskRow =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>)['id'] === 'string' &&
  typeof (value as Record<string, unknown>)['title'] === 'string' &&
  typeof (value as Record<string, unknown>)['status'] === 'string' &&
  typeof (value as Record<string, unknown>)['priority'] === 'string'

/** Returns true if value is a TaskRow array. */
const isTaskRowArray = (value: unknown): value is TaskRow[] =>
  Array.isArray(value) && value.every(isTaskRow)

/** Returns true if value is a ProjectRow. */
const isProjectRow = (value: unknown): value is ProjectRow =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>)['id'] === 'string' &&
  typeof (value as Record<string, unknown>)['name'] === 'string'

/** Available status transitions per current status. */
const statusTransitions: Record<
  'todo' | 'in_progress' | 'done',
  readonly ('todo' | 'in_progress' | 'done')[]
> = {
  todo: ['in_progress'],
  in_progress: ['todo', 'done'],
  done: ['in_progress'],
}

/** Human-readable labels for status values. */
const statusLabels: Record<'todo' | 'in_progress' | 'done', string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

/** Project detail page — shows project info, task list, and create task dialog. */
const ProjectDetailPage = () => {
  const { projectId } = Route.useParams()

  const [createOpen, setCreateOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [taskDueDate, setTaskDueDate] = useState('')

  /* eslint-disable
      @typescript-eslint/no-unsafe-assignment,
      @typescript-eslint/no-unsafe-call,
      @typescript-eslint/no-unsafe-member-access */
  // @ts-ignore — cross-package tRPC collision
  const {
    data: projectData,
    isLoading: projectLoading,
    error: projectError,
    // @ts-ignore — cross-package tRPC collision
  } = trpc.project.get.useQuery({ projectId })
  // @ts-ignore — cross-package tRPC collision
  const { data: tasksData, isLoading: tasksLoading } = trpc.task.list.useQuery({ projectId })
  // @ts-ignore — cross-package tRPC collision
  const utils = trpc.useUtils()
  // @ts-ignore — cross-package tRPC collision
  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false)
      setTaskTitle('')
      setTaskDescription('')
      setTaskPriority('medium')
      setTaskDueDate('')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      void utils.task.list.invalidate({ projectId })
      toast.success('Task created')
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    },
  })
  // @ts-ignore — cross-package tRPC collision
  const transitionTask = trpc.task.transition.useMutation({
    onSuccess: () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      void utils.task.list.invalidate({ projectId })
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

  const project: ProjectRow | undefined = isProjectRow(projectData) ? projectData : undefined
  const tasks: TaskRow[] | undefined = isTaskRowArray(tasksData) ? tasksData : undefined

  const isCreatePending: boolean =
    typeof createTask === 'object' &&
    createTask !== null &&
    (createTask as Record<string, unknown>)['isPending'] === true

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    createTask.mutate({
      projectId,
      title: taskTitle,
      description: taskDescription || undefined,
      priority: taskPriority,
      dueDate: taskDueDate ? new Date(taskDueDate) : undefined,
    })
  }

  const handleTransition = ({
    taskId,
    newStatus,
  }: {
    taskId: string
    newStatus: 'todo' | 'in_progress' | 'done'
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    transitionTask.mutate({ taskId, newStatus })
  }

  const tabBase = 'px-4 py-2 text-sm font-medium border-b-2 transition-colors'

  if (projectError !== null && projectError !== undefined) {
    return <div className="p-6 text-destructive">Failed to load project</div>
  }

  if (projectLoading === true) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Project header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{project !== undefined ? project.name : 'Project'}</h1>
          {project !== undefined && project.status === 'archived' && (
            <Badge variant="outline">Archived</Badge>
          )}
          {project !== undefined && project.frozen === true && (
            <Badge variant="secondary">Frozen</Badge>
          )}
        </div>

        {/* New Task button */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={project !== undefined && project.frozen === true}>
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task title"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Description (optional)</Label>
                <Textarea
                  id="task-description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="What needs to be done?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select
                  value={taskPriority}
                  onValueChange={(v) => {
                    if (v === 'low' || v === 'medium' || v === 'high') {
                      setTaskPriority(v)
                    }
                  }}
                >
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due Date (optional)</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} disabled={isCreatePending || !taskTitle.trim()}>
                {isCreatePending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-1 border-b mb-6">
        <Link
          to="/projects/$projectId"
          params={{ projectId }}
          activeOptions={{ exact: true }}
          activeProps={{ className: `${tabBase} border-primary text-primary` }}
          inactiveProps={{
            className: `${tabBase} border-transparent text-muted-foreground hover:text-foreground`,
          }}
        >
          Tasks
        </Link>
        <Link
          to="/projects/$projectId/members"
          params={{ projectId }}
          activeProps={{ className: `${tabBase} border-primary text-primary` }}
          inactiveProps={{
            className: `${tabBase} border-transparent text-muted-foreground hover:text-foreground`,
          }}
        >
          Members
        </Link>
        <Link
          to="/projects/$projectId/settings"
          params={{ projectId }}
          activeProps={{ className: `${tabBase} border-primary text-primary` }}
          inactiveProps={{
            className: `${tabBase} border-transparent text-muted-foreground hover:text-foreground`,
          }}
        >
          Settings
        </Link>
      </div>

      {/* Task list */}
      {tasksLoading === true && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {tasks !== undefined && tasks.length === 0 && (
        <div className="mt-12 text-center text-muted-foreground">
          <p>No tasks yet. Create your first task to get started.</p>
        </div>
      )}

      {tasks !== undefined && tasks.length > 0 && (
        <div className="rounded-md border">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={`flex items-center gap-4 px-4 py-3 ${
                index < tasks.length - 1 ? 'border-b' : ''
              }`}
            >
              {/* Title */}
              <span className="flex-1 text-sm font-medium">{task.title}</span>

              {/* Badges */}
              <div className="flex items-center gap-2">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
              </div>

              {/* Due date */}
              {task.dueDate !== null && task.dueDate !== undefined && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Task actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {statusTransitions[task.status].map((newStatus) => (
                    <DropdownMenuItem
                      key={newStatus}
                      onClick={() => handleTransition({ taskId: task.id, newStatus })}
                    >
                      Move to {statusLabels[newStatus]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const Route = createFileRoute('/_app/projects/$projectId/')({
  component: ProjectDetailPage,
})

export { Route }
