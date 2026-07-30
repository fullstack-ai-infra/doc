export const PUB_DOC_STATUS = {
  PUBLISHED: 'PUBLISHED',
  FROZEN: 'FROZEN',
  UNPUBLISHED: 'UNPUBLISHED',
} as const

export type PubDocStatusValue = (typeof PUB_DOC_STATUS)[keyof typeof PUB_DOC_STATUS]

export function canTransitionPubDocStatus(current: PubDocStatusValue, next: PubDocStatusValue) {
  if (current === next) return true

  const allowedTransitions: Record<PubDocStatusValue, PubDocStatusValue[]> = {
    [PUB_DOC_STATUS.PUBLISHED]: [PUB_DOC_STATUS.FROZEN, PUB_DOC_STATUS.UNPUBLISHED],
    [PUB_DOC_STATUS.FROZEN]: [PUB_DOC_STATUS.PUBLISHED, PUB_DOC_STATUS.UNPUBLISHED],
    [PUB_DOC_STATUS.UNPUBLISHED]: [PUB_DOC_STATUS.PUBLISHED],
  }

  return allowedTransitions[current].includes(next)
}

export function getPubDocStatusLabel(status: PubDocStatusValue) {
  if (status === PUB_DOC_STATUS.PUBLISHED) return '已发布'
  if (status === PUB_DOC_STATUS.FROZEN) return '已冻结'
  return '已撤销'
}
