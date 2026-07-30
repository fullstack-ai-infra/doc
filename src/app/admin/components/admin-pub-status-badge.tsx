import { Badge } from '@/components/ui/badge'
import { getAdminPublishStatusMeta } from '@/lib/admin-pub-status'
import { PubDocStatusValue } from '@/lib/pub-doc-status'

type Props = {
  latestPubDoc: {
    status: PubDocStatusValue
    statusReason?: string | null
    statusUpdatedAt?: Date | null
  } | null
  isPublished: boolean
}

export default function AdminPubStatusBadge({ latestPubDoc, isPublished }: Props) {
  const meta = getAdminPublishStatusMeta(latestPubDoc, isPublished)

  return (
    <Badge variant={meta.variant} className={meta.badgeClassName}>
      {meta.label}
    </Badge>
  )
}
