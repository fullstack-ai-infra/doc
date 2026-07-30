import type { Metadata } from 'next'
import { FileText, Globe, ShieldCheck, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdminOverview } from '@/lib/admin-data'

export const metadata: Metadata = {
  title: '后台概览',
}

const stats = [
  { key: 'docCount', label: '文档总数', icon: FileText, iconClassName: 'bg-blue-50 text-blue-600' },
  { key: 'publishedCount', label: '已发布文档', icon: Globe, iconClassName: 'bg-emerald-50 text-emerald-600' },
  { key: 'userCount', label: '用户总数', icon: Users, iconClassName: 'bg-amber-50 text-amber-600' },
  { key: 'adminCount', label: '管理员人数', icon: ShieldCheck, iconClassName: 'bg-violet-50 text-violet-600' },
] as const

export default async function AdminHomePage() {
  const values = await getAdminOverview()

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">概览</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{item.label}</CardTitle>
              <div className={`rounded-lg p-2 ${item.iconClassName}`}>
                <item.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{values[item.key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
