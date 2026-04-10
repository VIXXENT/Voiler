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
import { useTranslation } from '~/lib/i18n'
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
  const { t } = useTranslation()

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
    return <div className="p-6 text-destructive">{t({ key: 'tasks.failedToLoad' })}</div>
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
        <h1 className="text-2xl font-bold">
          {project !== undefined ? project.name : t({ key: 'common.project' })}
        </h1>
        {project !== undefined && project.status === 'archived' && (
          <Badge variant="outline">{t({ key: 'projects.archived' })}</Badge>
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
          {t({ key: 'tasks.title' })}
        </Link>
        <Link
          to="/projects/$projectId/members"
          params={{ projectId }}
          activeProps={{ className: `${tabBase} border-primary text-primary` }}
          inactiveProps={{
            className: `${tabBase} border-transparent text-muted-foreground hover:text-foreground`,
          }}
        >
          {t({ key: 'members.title' })}
        </Link>
        <Link
          to="/projects/$projectId/settings"
          params={{ projectId }}
          activeProps={{ className: `${tabBase} border-primary text-primary` }}
          inactiveProps={{
            className: `${tabBase} border-transparent text-muted-foreground hover:text-foreground`,
          }}
        >
          {t({ key: 'projects.settings' })}
        </Link>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Project info */}
        <Card>
          <CardHeader>
            <CardTitle>{t({ key: 'projects.projectName' })}</CardTitle>
            <CardDescription>{t({ key: 'projects.projectNameDesc' })}</CardDescription>
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
            <CardTitle>{t({ key: 'projects.archive' })}</CardTitle>
            <CardDescription>{t({ key: 'projects.archiveDesc' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={project !== undefined && project.status === 'archived'}
                >
                  {project !== undefined && project.status === 'archived'
                    ? t({ key: 'projects.alreadyArchived' })
                    : t({ key: 'projects.archive' })}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t({ key: 'projects.archive' })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t({ key: 'projects.archiveConfirm' })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t({ key: 'common.cancel' })}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive} disabled={isArchivePending}>
                    {isArchivePending
                      ? t({ key: 'projects.archiving' })
                      : t({ key: 'projects.archive' })}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Transfer ownership */}
        <Card>
          <CardHeader>
            <CardTitle>{t({ key: 'projects.transferOwnership' })}</CardTitle>
            <CardDescription>{t({ key: 'projects.transferOwnershipLongDesc' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">{t({ key: 'projects.transferOwnership' })}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t({ key: 'projects.transferOwnership' })}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    {t({ key: 'projects.transferOwnershipDialogDesc' })}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="new-owner-id">{t({ key: 'projects.newOwnerId' })}</Label>
                    <Input
                      id="new-owner-id"
                      value={newOwnerId}
                      onChange={(e) => setNewOwnerId(e.target.value)}
                      placeholder={t({ key: 'projects.newOwnerIdPlaceholder' })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setTransferOpen(false)}>
                    {t({ key: 'common.cancel' })}
                  </Button>
                  <Button
                    onClick={handleTransfer}
                    disabled={isTransferPending || !newOwnerId.trim()}
                  >
                    {isTransferPending
                      ? t({ key: 'projects.transferring' })
                      : t({ key: 'projects.transfer' })}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Delete project */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t({ key: 'projects.delete' })}</CardTitle>
            <CardDescription>{t({ key: 'projects.deleteDesc' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">{t({ key: 'projects.delete' })}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t({ key: 'projects.delete' })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t({ key: 'projects.deleteConfirm' })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t({ key: 'common.cancel' })}</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: 'destructive' })}
                    onClick={handleDelete}
                    disabled={isDeletePending}
                  >
                    {isDeletePending
                      ? t({ key: 'projects.deleting' })
                      : t({ key: 'projects.delete' })}
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
