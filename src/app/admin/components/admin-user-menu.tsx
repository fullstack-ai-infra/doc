'use client'

import { useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { post } from '@/lib/ajax'

type AdminUserMenuProps = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function AdminUserMenu({ name, email, image }: AdminUserMenuProps) {
  const [disabled, setDisabled] = useState(false)
  const displayName = name || email || '管理员'
  const displayEmail = name && email ? email : null
  const fallbackText = (displayName || '管').slice(0, 1).toUpperCase()

  async function handleSignOut() {
    const confirmed = window.confirm('确定退出登录吗？')
    if (!confirmed) return

    try {
      await post('/api/user/sign-out', {})
      setDisabled(true)
    } catch {}

    window.location.href = '/'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="ghost" className="h-auto gap-3 px-2 py-1.5">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={image || ''} alt={displayName} />
            <AvatarFallback>{fallbackText}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col items-start text-left">
            <span className="max-w-48 truncate text-sm font-medium text-slate-900">{displayName}</span>
            {displayEmail ? <span className="max-w-48 truncate text-xs text-slate-500">{displayEmail}</span> : null}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={handleSignOut} disabled={disabled} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
