import { Badge } from '~/components/ui/badge'

/** Props for the MemberRoleBadge component. */
interface MemberRoleBadgeProps {
  readonly role: 'owner' | 'member' | 'viewer'
}

/**
 * Shows membership role.
 * - owner → default (primary)
 * - member → secondary
 * - viewer → outline
 */
const MemberRoleBadge = ({ role }: MemberRoleBadgeProps) => {
  const variantMap: Record<'owner' | 'member' | 'viewer', 'default' | 'secondary' | 'outline'> = {
    owner: 'default',
    member: 'secondary',
    viewer: 'outline',
  }

  const textMap: Record<'owner' | 'member' | 'viewer', string> = {
    owner: 'Owner',
    member: 'Member',
    viewer: 'Viewer',
  }

  return <Badge variant={variantMap[role]}>{textMap[role]}</Badge>
}

export { MemberRoleBadge }
