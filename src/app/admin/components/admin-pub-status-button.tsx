'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { patch } from '@/lib/ajax'
import { getAdminPublishAction } from '@/lib/admin-pub-status'
import { PUB_DOC_STATUS, PubDocStatusValue } from '@/lib/pub-doc-status'

type Props = {
  publishId: string
  currentStatus: PubDocStatusValue
  targetStatus?: PubDocStatusValue
  label?: string
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link'
  className?: string
  confirmText?: string
}

export default function AdminPubStatusButton({
  publishId,
  currentStatus,
  targetStatus,
  label,
  variant = 'outline',
  className,
  confirmText,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  const nextStatus =
    targetStatus || (currentStatus === PUB_DOC_STATUS.PUBLISHED ? PUB_DOC_STATUS.FROZEN : PUB_DOC_STATUS.PUBLISHED)
  const action = getAdminPublishAction({ status: currentStatus })
  const buttonLabel = label || action?.label || '更新状态'

  async function submitStatus(nextReason = '') {
    if (loading) return

    setLoading(true)
    try {
      const res = await patch(`/api/admin/pub/${publishId}/status`, {
        status: nextStatus,
        reason: nextReason,
      })

      if (res.errno !== 0) {
        window.alert(res.msg || '操作失败')
        return
      }

      setOpen(false)
      setReason('')
      router.refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleClick() {
    if (loading) return

    if (nextStatus === PUB_DOC_STATUS.FROZEN) {
      setOpen(true)
      return
    }

    if (confirmText && !window.confirm(confirmText)) {
      return
    }

    await submitStatus()
  }

  async function handleConfirmFreeze() {
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      window.alert('请输入冻结原因')
      return
    }

    await submitStatus(trimmedReason)
  }

  return (
    <>
      <Button type="button" size="sm" variant={variant} className={className} onClick={handleClick} disabled={loading}>
        {loading ? '处理中...' : buttonLabel}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (loading) return
          setOpen(nextOpen)
          if (!nextOpen) setReason('')
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
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
