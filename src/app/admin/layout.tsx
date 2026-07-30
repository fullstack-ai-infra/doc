import '../globals.css'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAdminUser } from '@/lib/admin'
import AdminUserMenu from './components/admin-user-menu'
import AdminNavLink from './components/admin-nav-link'

const navItems = [
  { href: '/admin', label: '概览' },
  { href: '/admin/docs', label: '文档管理' },
  { href: '/admin/users', label: '用户管理' },
]

export const metadata: Metadata = {
  title: '后台管理',
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser()
  if (user == null) {
    redirect('/')
  }

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-7xl">
          <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:block">
            <div className="mb-8">
              <h1 className="mt-2 text-xl font-semibold">后台管理</h1>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <AdminNavLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          </aside>

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex-1" />
                <AdminUserMenu name={user.name} email={user.email} image={user.image} />
              </div>
              <nav className="flex gap-1 border-t border-slate-100 px-2 py-2 md:hidden">
                {navItems.map((item) => (
                  <AdminNavLink key={item.href} href={item.href} label={item.label} />
                ))}
              </nav>
            </header>

            <main className="flex-1 px-6 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
