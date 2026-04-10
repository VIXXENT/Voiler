import { Badge } from '~/components/ui/badge'
import { useTranslation } from '~/lib/i18n'

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
  const { t } = useTranslation()

  const variantMap: Record<'owner' | 'member' | 'viewer', 'default' | 'secondary' | 'outline'> = {
    owner: 'default',
    member: 'secondary',
    viewer: 'outline',
  }

  const textMap: Record<'owner' | 'member' | 'viewer', string> = {
    owner: t({ key: 'members.role.owner' }),
    member: t({ key: 'members.role.member' }),
    viewer: t({ key: 'members.role.viewer' }),
  }

  return <Badge variant={variantMap[role]}>{textMap[role]}</Badge>
}

export { MemberRoleBadge }
