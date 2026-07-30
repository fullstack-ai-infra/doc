import { FileQuestion } from 'lucide-react'

type Props = {
  title?: string
  description?: string
}

export default function AdminEmptyState({ title = '暂无数据', description = '当前没有匹配的记录' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3">
        <FileQuestion className="h-6 w-6 text-slate-400" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-900">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  )
}
