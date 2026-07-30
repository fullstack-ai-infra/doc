import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAdminUsers } from '@/lib/admin-data'
import AdminPagination from '../components/admin-pagination'
import AdminMutationButton from '../components/admin-mutation-button'
import AdminEmptyState from '../components/admin-empty-state'

export const metadata: Metadata = {
  title: '用户管理',
}

function formatDate(date: Date | null) {
  if (date == null) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: {
    q?: string
    page?: string
  }
}) {
  const { filters, items, pagination } = await getAdminUsers(searchParams || {})
  const createPageHref = (page: number) => {
    const params = new URLSearchParams()

    if (filters.q) params.set('q', filters.q)
    if (page > 1) params.set('page', String(page))

    const query = params.toString()
    return query ? `/admin/users?${query}` : '/admin/users'
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">用户管理</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">搜索条件</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input name="q" placeholder="搜索昵称或邮箱" defaultValue={filters.q} />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              搜索
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>昵称</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>邮箱验证时间</TableHead>
                <TableHead>文档数量</TableHead>
                <TableHead>是否管理员</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <AdminEmptyState title="暂无匹配用户" />
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name || '-'}</TableCell>
                  <TableCell className="text-slate-600">{item.email || '-'}</TableCell>
                  <TableCell className="text-slate-600">{formatDate(item.emailVerified)}</TableCell>
                  <TableCell>{item._count.docs}</TableCell>
                  <TableCell>
                    <Badge variant={item.isAdmin ? 'default' : 'outline'}>{item.isAdmin ? '是' : '否'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <AdminMutationButton
                        url={`/api/admin/users/${item.id}`}
                        body={{ isAdmin: !item.isAdmin }}
                        confirmText={item.isAdmin ? '确认取消该用户管理员权限？' : '确认设为管理员？'}
                        variant={item.isAdmin ? 'outline' : 'default'}
                      >
                        {item.isAdmin ? '取消管理员' : '设为管理员'}
                      </AdminMutationButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            createPageHref={createPageHref}
          />
        </CardContent>
      </Card>
    </section>
  )
}
