/* eslint-disable
    @typescript-eslint/no-unsafe-assignment,
    @typescript-eslint/no-unsafe-call,
    @typescript-eslint/no-unsafe-member-access */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
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
import { trpc } from '~/lib/trpc'

/** Shape of a project row returned by the API. */
interface ProjectRow {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly ownerId: string
  readonly status: 'active' | 'archived'
  readonly frozen: boolean
}

/** Returns true if value is a ProjectRow. */
const isProjectRow = (value: unknown): value is ProjectRow =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>)['id'] === 'string' &&
  typeof (value as Record<string, unknown>)['name'] === 'string' &&
  typeof (value as Record<string, unknown>)['ownerId'] === 'string'

/** Project settings page — archive, delete, and transfer ownership. */
const ProjectSettingsPage = () => {
  const { projectId } = Route.useParams()

  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [newOwnerId, setNewOwnerId] = useState('')

  // @ts-ignore — cross-package tRPC collision
  const {
    data: projectData,
    isLoading: projectLoading,
    error: projectError,
    // @ts-ignore — cross-package tRPC collision
  } = trpc.project.get.useQuery({ projectId })
  // @ts-ignore — cross-package tRPC collision
  const utils = trpc.useUtils()
  // @ts-ignore — cross-package tRPC collision
  const archiveProject = trpc.project.archive.useMutation({
    onSuccess: () => {
      setArchiveOpen(false)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      void utils.project.get.invalidate({ projectId })
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    },
  })
  // @ts-ignore — cross-package tRPC collision
  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      setDeleteOpen(false)
      window.location.href = '/projects'
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    },
  })
  // @ts-ignore — cross-package tRPC collision
  const transferOwnership = trpc.member.transferOwnership.useMutation({
    onSuccess: () => {
      setTransferOpen(false)
      setNewOwnerId('')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      void utils.project.get.invalidate({ projectId })
      toast.success('Ownership transferred')
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

  const isArchivePending: boolean =
    typeof archiveProject === 'object' &&
    archiveProject !== null &&
    (archiveProject as Record<string, unknown>)['isPending'] === true

  const isDeletePending: boolean =
    typeof deleteProject === 'object' &&
    deleteProject !== null &&
    (deleteProject as Record<string, unknown>)['isPending'] === true

  const isTransferPending: boolean =
    typeof transferOwnership === 'object' &&
    transferOwnership !== null &&
    (transferOwnership as Record<string, unknown>)['isPending'] === true

  const handleArchive = () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    archiveProject.mutate({ projectId })
  }

  const handleDelete = () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    deleteProject.mutate({ projectId })
  }

  const handleTransfer = () => {
    if (!newOwnerId.trim()) return
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    transferOwnership.mutate({ projectId, newOwnerId })
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
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold">{project !== undefined ? project.name : 'Project'}</h1>
        {project !== undefined && project.status === 'archived' && (
          <Badge variant="outline">Archived</Badge>
        )}
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

      <div className="max-w-2xl space-y-6">
        {/* Project info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Name</CardTitle>
            <CardDescription>The display name for this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{project !== undefined ? project.name : '—'}</p>
            {project !== undefined && project.description !== null && (
              <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Archive project */}
        <Card>
          <CardHeader>
            <CardTitle>Archive Project</CardTitle>
            <CardDescription>
              Archive this project to hide it from the active list. It can be restored later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={project !== undefined && project.status === 'archived'}
                >
                  {project !== undefined && project.status === 'archived'
                    ? 'Already Archived'
                    : 'Archive Project'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to archive{' '}
                    <span className="font-medium text-foreground">
                      {project !== undefined ? project.name : 'this project'}
                    </span>
                    ? It will be hidden from the active projects list.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive} disabled={isArchivePending}>
                    {isArchivePending ? 'Archiving...' : 'Archive'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Transfer ownership */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Ownership</CardTitle>
            <CardDescription>
              Transfer project ownership to another member. You will lose owner privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Transfer Ownership</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Ownership</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the User ID of the member who should become the new owner. This action
                    cannot be undone without their cooperation.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="new-owner-id">New Owner User ID</Label>
                    <Input
                      id="new-owner-id"
                      value={newOwnerId}
                      onChange={(e) => setNewOwnerId(e.target.value)}
                      placeholder="User ID"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setTransferOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTransfer}
                    disabled={isTransferPending || !newOwnerId.trim()}
                  >
                    {isTransferPending ? 'Transferring...' : 'Transfer'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Delete project */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Project</CardTitle>
            <CardDescription>
              Permanently delete this project and all its tasks. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Project</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete{' '}
                    <span className="font-medium text-foreground">
                      {project !== undefined ? project.name : 'this project'}
                    </span>
                    ? This will delete all tasks and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: 'destructive' })}
                    onClick={handleDelete}
                    disabled={isDeletePending}
                  >
                    {isDeletePending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const Route = createFileRoute('/_app/projects/$projectId/settings')({
  component: ProjectSettingsPage,
})

export { Route }
