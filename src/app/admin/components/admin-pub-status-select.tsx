'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getAdminPublishStatusMeta, getAdminPublishStatusOptions } from '@/lib/admin-pub-status'
import { patch } from '@/lib/ajax'
import { PUB_DOC_STATUS, PubDocStatusValue } from '@/lib/pub-doc-status'

type Props = {
  publishId: string
  currentStatus: PubDocStatusValue
  statusReason?: string | null
  statusUpdatedAt?: Date | null
  isPublished: boolean
}

export default function AdminPubStatusSelect({
  publishId,
  currentStatus,
  statusReason,
  statusUpdatedAt,
  isPublished,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [freezeOpen, setFreezeOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [pendingStatus, setPendingStatus] = useState<PubDocStatusValue | null>(null)

  const meta = getAdminPublishStatusMeta({ status: currentStatus, statusReason, statusUpdatedAt }, isPublished)
  const options = getAdminPublishStatusOptions(currentStatus)

  async function submitStatus(targetStatus: PubDocStatusValue, nextReason = '') {
    if (loading) return

    setLoading(true)
    try {
      const res = await patch(`/api/admin/pub/${publishId}/status`, {
        status: targetStatus,
        reason: nextReason,
      })

      if (res.errno !== 0) {
        window.alert(res.msg || '操作失败')
        return
      }

      router.refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '操作失败')
    } finally {
      setLoading(false)
      setReason('')
      setPendingStatus(null)
    }
  }

  function handleSelect(targetStatus: PubDocStatusValue) {
    if (targetStatus === PUB_DOC_STATUS.FROZEN) {
      setPendingStatus(targetStatus)
      setFreezeOpen(true)
      return
    }

    if (targetStatus === PUB_DOC_STATUS.UNPUBLISHED) {
      if (!window.confirm('确认撤销该发布内容？撤销后公开链接将不可访问。')) {
        return
      }
      submitStatus(targetStatus)
      return
    }

    submitStatus(targetStatus)
  }

  function handleConfirmFreeze() {
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      window.alert('请输入冻结原因')
      return
    }

    setFreezeOpen(false)
    submitStatus(pendingStatus || PUB_DOC_STATUS.FROZEN, trimmedReason)
  }

  if (options.length === 0) {
    return (
      <Badge variant={meta.variant} className={meta.badgeClassName}>
        {meta.label}
      </Badge>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={loading}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              meta.badgeClassName
            )}
          >
            {meta.label}
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[7rem]">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.targetStatus}
              onClick={() => handleSelect(option.targetStatus)}
              disabled={loading}
              className={
                option.targetStatus === PUB_DOC_STATUS.UNPUBLISHED
                  ? 'text-destructive focus:text-destructive'
                  : undefined
              }
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={freezeOpen}
        onOpenChange={(nextOpen) => {
          if (loading) return
          setFreezeOpen(nextOpen)
          if (!nextOpen) {
            setReason('')
            setPendingStatus(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>冻结发布</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="请输入冻结原因"
              maxLength={100}
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFreezeOpen(false)} disabled={loading}>
              取消
            </Button>
            <Button type="button" onClick={handleConfirmFreeze} disabled={loading}>
              {loading ? '处理中...' : '确认冻结'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
