'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  label: string
}

export default function AdminNavLink({ href, label }: Props) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      {label}
    </Link>
  )
}
