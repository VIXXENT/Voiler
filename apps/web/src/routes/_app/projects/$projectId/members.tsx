/* eslint-disable
    @typescript-eslint/no-unsafe-assignment,
    @typescript-eslint/no-unsafe-call,
    @typescript-eslint/no-unsafe-member-access */
import { createFileRoute, Link } from '@tanstack/react-router'
import { MoreHorizontal, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { MemberRoleBadge } from '~/components/MemberRoleBadge'
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
import { useTranslation } from '~/lib/i18n'
import { trpc } from '~/lib/trpc'

/** Shape of a member row returned by the API. */
interface MemberRow {
  readonly id: string
  readonly userId: string
  readonly role: 'member' | 'viewer'
  readonly joinedAt: Date
}

/** Shape of a project row returned by the API. */
interface ProjectRow {
  readonly id: string
  readonly name: string
  readonly ownerId: string
  readonly status: 'active' | 'archived'
  readonly frozen: boolean
}

/** Returns true if value is a MemberRow. */
const isMemberRow = (value: unknown): value is MemberRow =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>)['id'] === 'string' &&
  typeof (value as Record<string, unknown>)['userId'] === 'string' &&
  typeof (value as Record<string, unknown>)['role'] === 'string'

/** Returns true if value is a MemberRow array. */
const isMemberRowArray = (value: unknown): value is MemberRow[] =>
  Array.isArray(value) && value.every(isMemberRow)

/** Returns true if value is a ProjectRow. */
const isProjectRow = (value: unknown): value is ProjectRow =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>)['id'] === 'string' &&
  typeof (value as Record<string, unknown>)['ownerId'] === 'string'

/** Project members page — lists members, supports invite, role change, and remove. */
const ProjectMembersPage = () => {
  const { projectId } = Route.useParams()
  const { t } = useTranslation()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [targetUserId, setTargetUserId] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member')

  // @ts-ignore — cross-package tRPC collision
  const {
    data: projectData,
    isLoading: projectLoading,
    error: projectError,
    // @ts-ignore — cross-package tRPC collision
  } = trpc.project.get.useQuery({ projectId })
  // @ts-ignore — cross-package tRPC collision
  const { data: membersData, isLoading: membersLoading } = trpc.member.list.useQuery({ projectId })
  // @ts-ignore — cross-package tRPC collision
  const utils = trpc.useUtils()
  // @ts-ignore — cross-package tRPC collision
  const inviteMember = trpc.member.invite.useMutation({
    onSuccess: () => {
      setInviteOpen(false)
      setTargetUserId('')
      setInviteRole('member')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      void utils.member.list.invalidate({ projectId })
      toast.success('Member invited')
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    },
  })
  // @ts-ignore — cross-package tRPC collision
  const removeMember = trpc.member.remove.useMutation({
    onSuccess: () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      void utils.member.list.invalidate({ projectId })
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    },
  })
  // @ts-ignore — cross-package tRPC collision
  const updateRole = trpc.member.updateRole.useMutation({
    onSuccess: () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      void utils.member.list.invalidate({ projectId })
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
  const members: MemberRow[] | undefined = isMemberRowArray(membersData) ? membersData : undefined

  const isInvitePending: boolean =
    typeof inviteMember === 'object' &&
    inviteMember !== null &&
    (inviteMember as Record<string, unknown>)['isPending'] === true

  const handleInvite = () => {
    if (!targetUserId.trim()) return
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    inviteMember.mutate({ projectId, targetUserId, role: inviteRole })
  }

  const handleRemove = ({ memberUserId }: { memberUserId: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    removeMember.mutate({ projectId, targetUserId: memberUserId })
  }

  const handleUpdateRole = ({
    memberUserId,
    newRole,
  }: {
    memberUserId: string
    newRole: 'member' | 'viewer'
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    updateRole.mutate({ projectId, targetUserId: memberUserId, newRole })
  }

  const tabBase = 'px-4 py-2 text-sm font-medium border-b-2 transition-colors'

  if (projectError !== null && projectError !== undefined) {
    return <div className="p-6 text-destructive">{t({ key: 'members.failedToLoad' })}</div>
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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">
          {project !== undefined ? project.name : t({ key: 'common.project' })}
        </h1>

        {/* Invite Member button */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> {t({ key: 'members.invite' })}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t({ key: 'members.inviteTitle' })}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="target-user-id">{t({ key: 'members.targetUserId' })}</Label>
                <Input
                  id="target-user-id"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder={t({ key: 'members.userIdPlaceholder' })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">{t({ key: 'members.role' })}</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => {
                    if (v === 'member' || v === 'viewer') {
                      setInviteRole(v)
                    }
                  }}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">{t({ key: 'members.role.member' })}</SelectItem>
                    <SelectItem value="viewer">{t({ key: 'members.role.viewer' })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                {t({ key: 'common.cancel' })}
              </Button>
              <Button onClick={handleInvite} disabled={isInvitePending || !targetUserId.trim()}>
                {isInvitePending
                  ? t({ key: 'members.inviting' })
                  : t({ key: 'members.invite.button' })}
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

      {/* Members list */}
      {membersLoading === true && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Owner row */}
      {project !== undefined && (
        <div className="flex items-center justify-between rounded-lg border p-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {project.ownerId.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{project.ownerId}</p>
              <p className="text-xs text-muted-foreground">{t({ key: 'members.ownerLabel' })}</p>
            </div>
          </div>
          <MemberRoleBadge role="owner" />
        </div>
      )}

      {/* Member rows */}
      {members !== undefined &&
        members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between rounded-lg border p-4 mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {member.userId.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{member.userId}</p>
                <p className="text-xs text-muted-foreground">
                  {t({
                    key: 'members.joined',
                    params: { date: new Date(member.joinedAt).toLocaleDateString() },
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MemberRoleBadge role={member.role} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {member.role === 'viewer' && (
                    <DropdownMenuItem
                      onClick={() =>
                        handleUpdateRole({ memberUserId: member.userId, newRole: 'member' })
                      }
                    >
                      {t({ key: 'members.changeToMember' })}
                    </DropdownMenuItem>
                  )}
                  {member.role === 'member' && (
                    <DropdownMenuItem
                      onClick={() =>
                        handleUpdateRole({ memberUserId: member.userId, newRole: 'viewer' })
                      }
                    >
                      {t({ key: 'members.changeToViewer' })}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleRemove({ memberUserId: member.userId })}
                  >
                    {t({ key: 'members.remove' })}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

      {members !== undefined && members.length === 0 && (
        <div className="mt-8 text-center text-muted-foreground">
          <p>{t({ key: 'members.emptyLong' })}</p>
        </div>
      )}
    </div>
  )
}

const Route = createFileRoute('/_app/projects/$projectId/members')({
  component: ProjectMembersPage,
})

export { Route }
