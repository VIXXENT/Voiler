import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '~/components/layout'
import { ProjectCard } from '~/components/ProjectCard'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Skeleton } from '~/components/ui/skeleton'
import { Textarea } from '~/components/ui/textarea'
import { trpc } from '~/lib/trpc'

/** Shape of a public project returned by the API. */
interface ProjectRow {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly ownerId: string
  readonly status: 'active' | 'archived'
  readonly frozen: boolean
  readonly memberCount?: number
  readonly taskCount?: number
}

/** Returns true if value is a ProjectRow. */
const isProjectRow = (value: unknown): value is ProjectRow =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>)['id'] === 'string' &&
  typeof (value as Record<string, unknown>)['name'] === 'string'

/** Returns true if value is a ProjectRow array. */
const isProjectRowArray = (value: unknown): value is ProjectRow[] =>
  Array.isArray(value) && value.every(isProjectRow)

/** Projects list page — shows all user's projects with create project dialog. */
const ProjectsPage = () => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  /* eslint-disable
      @typescript-eslint/no-unsafe-assignment,
      @typescript-eslint/no-unsafe-call,
      @typescript-eslint/no-unsafe-member-access */
  // @ts-expect-error — cross-package tRPC collision
  const { data, isLoading, error } = trpc.project.list.useQuery()
  // @ts-expect-error — cross-package tRPC collision
  const utils = trpc.useUtils()
  // @ts-expect-error — cross-package tRPC collision
  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      setOpen(false)
      setName('')
      setDescription('')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      void utils.project.list.invalidate()
      toast.success('Project created')
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

  const projects: ProjectRow[] | undefined = isProjectRowArray(data) ? data : undefined
  const isPending: boolean =
    typeof createProject === 'object' &&
    createProject !== null &&
    (createProject as Record<string, unknown>)['isPending'] === true

  const handleCreate = () => {
    if (!name.trim()) return
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    createProject.mutate({ name, description: description || undefined })
  }

  if (error !== null && error !== undefined) {
    return <div className="p-6 text-destructive">Failed to load projects</div>
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Projects"
        description="Manage your projects"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My awesome project"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this project about?"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading === true && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      )}

      {projects !== undefined && projects.length === 0 && (
        <div className="mt-12 text-center text-muted-foreground">
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      )}

      {projects !== undefined && projects.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} {...project} />
          ))}
        </div>
      )}
    </div>
  )
}

const Route = createFileRoute('/_app/projects/')({
  component: ProjectsPage,
})

export { Route }
