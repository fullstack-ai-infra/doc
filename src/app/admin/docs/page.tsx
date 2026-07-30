import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAdminDocs } from '@/lib/admin-data'
import AdminPagination from '../components/admin-pagination'
import AdminDocFilters from '../components/admin-doc-filters'
import AdminDocDetailDialog from '../components/admin-doc-detail-dialog'
import AdminEmptyState from '../components/admin-empty-state'
import AdminMutationButton from '../components/admin-mutation-button'
import AdminPubStatusSelect from '../components/admin-pub-status-select'

export const metadata: Metadata = {
  title: '文档管理',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default async function AdminDocsPage({
  searchParams,
}: {
  searchParams?: {
    q?: string
    author?: string
    deleteStatus?: string
    publishStatus?: string
    page?: string
  }
}) {
  const { filters, items, pagination } = await getAdminDocs(searchParams || {})
  const createPageHref = (page: number) => {
    const params = new URLSearchParams()

    if (filters.q) params.set('q', filters.q)
    if (filters.author) params.set('author', filters.author)
    if (filters.deleteStatus !== 'all') params.set('deleteStatus', filters.deleteStatus)
    if (filters.publishStatus !== 'all') params.set('publishStatus', filters.publishStatus)
    if (page > 1) params.set('page', String(page))

    const query = params.toString()
    return query ? `/admin/docs?${query}` : '/admin/docs'
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">文档管理</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminDocFilters
            initialQ={filters.q}
            initialAuthor={filters.author}
            initialDeleteStatus={filters.deleteStatus}
            initialPublishStatus={filters.publishStatus}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">文档列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>文档标题</TableHead>
                <TableHead>作者</TableHead>
                <TableHead className="w-[11rem] whitespace-nowrap">更新时间</TableHead>
                <TableHead>删除状态</TableHead>
                <TableHead>发布状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <AdminEmptyState title="暂无匹配文档" />
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => {
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-slate-600">
                      {item.user.name || item.user.email || item.user.id}
                    </TableCell>
                    <TableCell className="w-[11rem] whitespace-nowrap text-slate-600">
                      {formatDate(item.updatedAt)}
                    </TableCell>
                    <TableCell>
                      {item.isDeleted ? (
                        <span className="inline-flex items-center rounded-full border border-transparent bg-destructive px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-destructive-foreground">
                          已删除
                        </span>
                      ) : (
                        <span className="text-sm text-slate-500">正常</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.latestPubDoc ? (
                        <AdminPubStatusSelect
                          publishId={item.latestPubDoc.publishId}
                          currentStatus={item.latestPubDoc.status}
                          statusReason={item.latestPubDoc.statusReason}
                          statusUpdatedAt={item.latestPubDoc.statusUpdatedAt}
                          isPublished={item.isPublished}
                        />
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-slate-500">
                          未发布
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-nowrap justify-end gap-2">
                        <AdminDocDetailDialog doc={item} />
                        <AdminMutationButton
                          url="/api/admin/docs"
                          body={{ id: item.id, isDeleted: !item.isDeleted }}
                          confirmText={item.isDeleted ? '确认恢复该文档？' : '确认删除该文档？'}
                          variant="ghost"
                          className={
                            item.isDeleted
                              ? undefined
                              : 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                          }
                        >
                          {item.isDeleted ? '恢复' : '删除'}
                        </AdminMutationButton>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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
