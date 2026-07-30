'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AdminDocDeleteStatus,
  AdminDocPublishStatus,
  adminDocDeleteStatusOptions,
  adminDocPublishStatusOptions,
} from '@/lib/admin-filters'

type Props = {
  initialQ: string
  initialAuthor: string
  initialDeleteStatus: AdminDocDeleteStatus
  initialPublishStatus: AdminDocPublishStatus
}

const deleteStatusLabels: Record<AdminDocDeleteStatus, string> = {
  all: '全部',
  active: '正常',
  deleted: '已删除',
}

const publishStatusLabels: Record<AdminDocPublishStatus, string> = {
  all: '全部',
  published: '已发布',
  frozen: '已冻结',
  unpublished: '已撤销',
  never: '未发布',
}

export default function AdminDocFilters({ initialQ, initialAuthor, initialDeleteStatus, initialPublishStatus }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(initialQ)
  const [author, setAuthor] = useState(initialAuthor)
  const [deleteStatus, setDeleteStatus] = useState<AdminDocDeleteStatus>(initialDeleteStatus)
  const [publishStatus, setPublishStatus] = useState<AdminDocPublishStatus>(initialPublishStatus)

  const canReset = useMemo(() => {
    return q !== '' || author !== '' || deleteStatus !== 'all' || publishStatus !== 'all'
  }, [author, deleteStatus, publishStatus, q])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const params = new URLSearchParams()
    const trimmedQ = q.trim()
    const trimmedAuthor = author.trim()

    if (trimmedQ) params.set('q', trimmedQ)
    if (trimmedAuthor) params.set('author', trimmedAuthor)
    if (deleteStatus !== 'all') params.set('deleteStatus', deleteStatus)
    if (publishStatus !== 'all') params.set('publishStatus', publishStatus)

    const query = params.toString()
    router.push(query ? `/admin/docs?${query}` : '/admin/docs')
  }

  function handleReset() {
    setQ('')
    setAuthor('')
    setDeleteStatus('all')
    setPublishStatus('all')
    router.push('/admin/docs')
  }

  return (
    <form className="grid gap-3 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto_auto]" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label>标题</Label>
        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜索标题" />
      </div>
      <div className="space-y-2">
        <Label>作者</Label>
        <Input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="搜索昵称或邮箱" />
      </div>
      <div className="space-y-2">
        <Label>删除状态</Label>
        <Select value={deleteStatus} onValueChange={(value) => setDeleteStatus(value as AdminDocDeleteStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            {adminDocDeleteStatusOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {deleteStatusLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>发布状态</Label>
        <Select value={publishStatus} onValueChange={(value) => setPublishStatus(value as AdminDocPublishStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            {adminDocPublishStatusOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {publishStatusLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          搜索
        </button>
      </div>
      <div className="flex items-end">
        <button
          type="button"
          onClick={handleReset}
          disabled={!canReset}
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          重置
        </button>
      </div>
    </form>
  )
}
