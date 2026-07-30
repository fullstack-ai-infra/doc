'use client'

import { memo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useEditorStore, ICollabUser } from '@/stores/editor-store'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
  id: string
}

export default function DocUpdateStatus(props: IProps) {
  const { id } = props

  const editorDocId = useEditorStore((s) => s.docId)

  const characterCount = useEditorStore((s) => s.characterCount)
  const wordCount = useEditorStore((s) => s.wordCount)
  const locale = useLocale()
  const t = useTranslations('editor')

  // collaborative state
  const collaborativeState = useEditorStore((s) => s.collaborativeState)

  // collaborative users
  const collaborativeUsers = useEditorStore((s) => s.collaborativeUsers)

  if (id === '0') return null

  // 切换文档的瞬间，两者可能不一致
  if (id !== editorDocId) return <Skeleton className="h-6 w-32 ml-3" />

  return (
    <>
      {/* collaborative users */}
      <div className="ml-5 flex" role="collaborative-users">
        {collaborativeUsers.map((user: ICollabUser) => {
          let { clientId, name, avatar, email } = user || {}
          if (!name) name = email
          if (!name) return null
          return (
            <TooltipProvider key={clientId}>
              <Tooltip>
                <TooltipTrigger>
                  <UserAvatar avatar={avatar} name={name} />
                </TooltipTrigger>
                <TooltipContent>{name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
      {/* collaborative state */}
      <div className="ml-2 inline-flex items-center">
        <div
          role="collaborative-state"
          data-title={collaborativeState}
          className={cn('w-2 h-2 rounded-full', {
            'bg-yellow-500 dark:bg-yellow-400': collaborativeState === 'connecting',
            'bg-green-500 dark:bg-green-400': collaborativeState === 'connected',
            'bg-red-500 dark:bg-red-400': collaborativeState === 'disconnected',
          })}
        ></div>
        {/* <span className="text-muted-foreground ml-1">{collaborativeState}</span> */}
      </div>
      {/* character count */}
      <span role="char-count" className="text-muted-foreground text-sm ml-2 inline-flex items-center">
        {locale === 'zh-cn' && `共 ${characterCount >= 0 ? characterCount : '---'} 字`}
        {locale !== 'zh-cn' &&
          `Total ${wordCount >= 0 ? wordCount : '---'} words, ${characterCount >= 0 ? characterCount : '---'} characters`}
      </span>
    </>
  )
}

const UserAvatar = memo(function AvatarWrapper(props: { avatar: string; name: string }) {
  const { avatar, name } = props
  return (
    <Avatar className="h-7 w-7 border -ml-2">
      <AvatarImage src={avatar || ''} alt={name || ''} />
      <AvatarFallback>{name?.slice(0, 1)}</AvatarFallback>
    </Avatar>
  )
})
