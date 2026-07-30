'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import TiptapEditor from '@/components/editor'
import { updateTitle, updateIcon } from '../client-action'
import emitter from '@/lib/emitter'
import {
  CONTENT_WIDTH,
  DOC_TITLE_INPUT_ID,
  LAST_DOC_ID_KEY,
  EVENT_KEY_FOCUS_CONTENT,
  WORK_CONTENT_CONTAINER_ID,
  DOC_ICON_LIST,
} from '@/constants'
import { useDocsStore } from '@/stores/docs-store'
import { useTranslations } from 'next-intl'
import { getRandomElement } from '@/lib/utils'
import { flushCurrentDocVersionByBeacon, flushDocVersionById } from '@/lib/doc-version/client'

export default function ContentForMyDoc() {
  const docs = useDocsStore((s) => s.docs)
  const id = useDocsStore((s) => s.curDocId)
  const curDoc = useMemo(() => docs.find((d) => d.id === id), [docs, id])
  const { title = '', icon = '' } = curDoc || {}
  const updateDocTitle = useDocsStore((s) => s.updateDocTitle)
  const updateDocIcon = useDocsStore((s) => s.updateDocIcon)

  // record last doc id
  useEffect(() => {
    localStorage.setItem(LAST_DOC_ID_KEY, id) // 保存最后一次打开的文档 id
  }, [id])

  useEffect(() => {
    // 页面刷新或关闭时尽力通过 beacon 发送一个当前版本快照。
    const saveVersionByBeacon = () => {
      flushCurrentDocVersionByBeacon()
    }

    window.addEventListener('pagehide', saveVersionByBeacon)
    return () => {
      window.removeEventListener('pagehide', saveVersionByBeacon)
    }
  }, [])

  useEffect(() => {
    // 当前文档切换前补一次异步版本保存，兜住非 nav 触发的文档跳转。
    return () => {
      flushDocVersionById(id)
    }
  }, [id])

  const [renderEditor, setRenderEditor] = useState(false)
  useEffect(() => {
    setRenderEditor(false)
    setTimeout(() => {
      setRenderEditor(true) // when doc changed, force re-render editor
    }, 100)
  }, [id])

  const fullWidth = CONTENT_WIDTH + 80 // 两边留白 40px

  if (!curDoc) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Error: curDoc is null.</p>
      </div>
    )
  }

  return (
    <div
      id={WORK_CONTENT_CONTAINER_ID}
      className={`mx-auto my-12 mb-20 scroll-mt-5`}
      style={{ maxWidth: `${fullWidth}px` }}
    >
      <div className="mx-10 mb-6 flex">
        <IconInput id={id} icon={icon} updateDocIcon={updateDocIcon} />
        <TitleInput id={id} title={title} updateDocTitle={updateDocTitle} />
        {/* 可能还会再增加其他功能，例如设置 Icon 、背景等 */}
      </div>
      {renderEditor && <TiptapEditor id={id} />}
      {/* <p className="mx-10">editor {id}</p> */}
    </div>
  )
}

function IconInput(props: { id: string; icon: string | null; updateDocIcon: (id: string, title: string) => void }) {
  const { id, icon, updateDocIcon } = props

  // init icon
  useEffect(() => {
    if (!icon) {
      const newIcon = getRandomElement(DOC_ICON_LIST)
      updateDocIcon(id, newIcon) // 更新 store
      setTimeout(() => {
        try {
          updateIcon(id, newIcon) // 更新数据库。对于新建的文档，需要延迟一秒再更新数据库，否则数据库中没有这个文档
        } catch (ex) {}
      }, 1000)
    }
  }, [id, icon, updateDocIcon])

  // change icon
  const changeIconHandler = (newIcon: string) => {
    updateDocIcon(id, newIcon) // 更新 store
    updateIcon(id, newIcon) // 更新数据库
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="mr-2 cursor-pointer">
          <span className="text-4xl">{icon}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-80">
        {DOC_ICON_LIST.map((i) => (
          <div key={i} className="inline-block text-xl p-1 cursor-pointer" onClick={() => changeIconHandler(i)}>
            <span>{i}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function TitleInput(props: { id: string; title: string; updateDocTitle: (id: string, title: string) => void }) {
  const { id, title, updateDocTitle } = props
  const t = useTranslations('docItem')

  useEffect(() => {
    document.title = title || t('unTitled')
  }, [title, t])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value
    updateDocTitle(id, newTitle)
    updateTitle(id, newTitle || t('unTitled')) // 更新数据库
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.code !== 'Enter') return
    const pos = (e.target as HTMLInputElement).selectionStart || 0 // cursor position
    if (pos < title.length) return
    emitter.emit(EVENT_KEY_FOCUS_CONTENT)
  }

  return (
    <Input
      id={DOC_TITLE_INPUT_ID}
      placeholder={t('titleInputPlaceholder')}
      value={title}
      maxLength={100}
      onChange={handleChange}
      className="border-none p-0 text-4xl font-bold focus-visible:ring-transparent"
      onKeyUp={handleKeyUp}
    />
  )
}
