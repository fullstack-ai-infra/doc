'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import type { UIMessage } from 'ai'
import { X, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDialogStore } from '@/stores/dialog-store'
import AIInput from './ai-input'
import useRequestAI from './hooks/useRequestAI'
import { cn } from '@/lib/utils'
import {
  AI_CONTEXT_MAX_LENGTH,
  AI_PANEL_HISTORY_TURNS,
  EVENT_KEY_FOCUS_AI,
  EVENT_KEY_EDITOR_AI_MENU,
} from '@/constants'
import emitter from '@/lib/emitter'
import { toUIMessage } from '@/lib/chat-messages'
import { useDocsStore } from '@/stores/docs-store'
import ChatItemUser from './chat-item/chat-item-user'
import ChatItemAI from './chat-item/chat-item-ai'
import ChatItemAIGenerating from './chat-item/chat-item-ai-generating'
import ItemMenus from './chat-item/item-menus'
import { useTranslations } from 'next-intl'
import ContinueMenu from './shortcut-menus/continue-menu'
import BrainStormMenu from './shortcut-menus/brain-storm-menu'
import OutlineMenu from './shortcut-menus/outline-menu'
import SummaryMenu from './shortcut-menus/summary-menu'
import { MessagesType } from './hooks/useGenMessages'
import ClearChatButton from './clear-chat-button'
import { buildHistoryMessages } from './util'

interface IChatItem {
  id: string
  content: string
  from: 'user' | 'AI'
  // selectionText?: string
}

interface IChatListData {
  docId: string
  chatList: IChatItem[]
}

export default function AiPanel() {
  const t = useTranslations('AIInput')

  const setAIPanelOpen = useDialogStore((s) => s.setAIPanelOpen)

  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [isFocus, setIsFocus] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [AIResult, setAIResult] = useState('')
  const [delay, setDelay] = useState(0) // 每次请求间隔时间
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])

  const { requestAI, abortRequestAI, reRequestAI } = useRequestAI({
    loading,
    setAIResult,
    setLoading,
    setInstruction,
    delay,
    setDelay,
    initialMessages,
  })

  // 监听 focus AI 自定义事件
  useEffect(() => {
    if (!inputRef.current) return
    function fn() {
      inputRef.current?.focus()
    }
    emitter.on(EVENT_KEY_FOCUS_AI, fn)
    return () => {
      emitter.off(EVENT_KEY_FOCUS_AI, fn)
    }
  }, [inputRef])

  // 监听 editor 选中文本时 AI-menu 时间
  useEffect(() => {
    function fn(data: { instruction: string; messages: MessagesType }) {
      const { instruction, messages } = data || {}
      setInstruction(instruction)
      requestAI(messages)
    }
    // @ts-ignore-next-line
    emitter.on(EVENT_KEY_EDITOR_AI_MENU, fn)
    return () => {
      // @ts-ignore-next-line
      emitter.off(EVENT_KEY_EDITOR_AI_MENU, fn)
    }
  }, [setInstruction, requestAI])

  // 间隔时间递减
  useEffect(() => {
    const t = setInterval(() => {
      setDelay((prev) => {
        if (prev === 0) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  })

  // 从 localStorage 获取聊天记录
  const [chatListData, setChatListData] = useState<IChatListData>() // 聊天记录
  const chatList = useMemo(() => chatListData?.chatList || [], [chatListData])
  const curDocId = useDocsStore((s) => s.curDocId)
  const STORE_KEY = useMemo(() => `CHAT-LIST-DATA-${curDocId}`, [curDocId])
  useEffect(() => {
    if (!curDocId) return
    const chatListDataRaw = localStorage.getItem(STORE_KEY)
    try {
      const chatListDataObj = JSON.parse(
        chatListDataRaw || `{ "docId": "${curDocId}", "chatList": [] }`
      ) as IChatListData
      setChatListData(chatListDataObj)
      const historyMessages = buildHistoryMessages(
        chatListDataObj.chatList || [],
        AI_PANEL_HISTORY_TURNS,
        AI_CONTEXT_MAX_LENGTH
      )
      setInitialMessages(historyMessages.map(toUIMessage))
    } catch (error) {
      console.error('Error parsing chat list data from localStorage:', error)
      setChatListData({ docId: curDocId, chatList: [] })
      setInitialMessages([])
    }
  }, [curDocId, STORE_KEY])

  // 把聊天记录存入 localStorage
  useEffect(() => {
    const { docId, chatList = [] } = chatListData || {}
    if (docId !== curDocId) return
    if (chatList.length === 0) return
    localStorage.setItem(STORE_KEY, JSON.stringify(chatListData))
  }, [chatListData, curDocId, STORE_KEY])

  // 增加聊天记录
  useEffect(() => {
    if (AIResult === '') return
    if (loading) return
    if (instruction === '') return

    const { docId, chatList = [] } = chatListData || {}
    if (docId !== curDocId) return

    const instructionItem: IChatItem = { id: crypto.randomUUID(), content: instruction, from: 'user' }
    const AIResultItem: IChatItem = { id: crypto.randomUUID(), content: AIResult, from: 'AI' }
    const newChatListData = { docId, chatList: [...chatList, instructionItem, AIResultItem] }
    setChatListData(newChatListData)
    setInstruction('')
  }, [loading, curDocId, AIResult, instruction, chatListData])

  // list scroll to bottom
  const chatListRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (chatList.length === 0) return
    if (chatListRef.current === null) return
    const elem = chatListRef.current
    elem.scrollTo({
      top: elem.scrollHeight,
      behavior: 'smooth',
    })
  }, [curDocId, chatList])

  // 监听 input focus blur
  useEffect(() => {
    if (!inputRef.current) return
    function handleFocus() {
      setIsFocus(true)
      setAIResult('')
    }
    function handleBlur() {
      setTimeout(() => setIsFocus(false), 150)
    }
    inputRef.current.addEventListener('focus', handleFocus)
    inputRef.current.addEventListener('blur', handleBlur)

    return () => {
      if (!inputRef.current) return
      inputRef.current.removeEventListener('focus', handleFocus)
      inputRef.current.removeEventListener('blur', handleBlur) // eslint-disable-line
    }
  }, [inputRef, chatList])

  const clearDisabled = loading || chatList.length === 0

  function handleClearChat() {
    if (!curDocId) return
    abortRequestAI()
    localStorage.removeItem(STORE_KEY)
    setChatListData({ docId: curDocId, chatList: [] })
    setInitialMessages([])
    setInstruction('')
    setAIResult('')
  }

  return (
    <>
      <div className="flex justify-between w-full p-1 py-2 border-b border-b-secondary text-muted-foreground">
        <p className="font-bold ml-1">{t('AIWritingChat')}</p>
        <div className="flex items-center gap-1">
          <ClearChatButton disabled={clearDisabled} onConfirm={handleClearChat} />
          <Button variant="ghost" size="icon" onClick={() => setAIPanelOpen(false)} className="p-1 m-0 h-6 w-6">
            <X size={16} />
          </Button>
        </div>
      </div>
      {/* 无聊天记录时，input 居中显示 */}
      {chatList.length === 0 && !loading && (
        <div className="flex-auto w-full flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center w-full h-full p-4 text-secondary-foreground ">
            <div className={cn('mb-2 ', isFocus && 'text-blue-600')}>
              <Bot size={40} />
            </div>
            <p className={cn('mb-2', isFocus && 'text-blue-600')}>{t('useAIWritingChat')}</p>
            <AIInput
              isFocus={isFocus}
              loading={loading}
              onAbortRequestAI={abortRequestAI}
              onRequestAI={requestAI}
              instruction={instruction}
              setInstruction={setInstruction}
              delay={delay}
              chatList={chatList}
              ref={inputRef}
            />
            <div className={cn('space-y-1 text-left w-full mt-4')}>
              <div>
                <ContinueMenu isFocus={isFocus} onRequestAI={requestAI} setInstruction={setInstruction} />
              </div>
              <div>
                <BrainStormMenu isFocus={isFocus} onRequestAI={requestAI} setInstruction={setInstruction} />
              </div>
              <div>
                <OutlineMenu isFocus={isFocus} onRequestAI={requestAI} setInstruction={setInstruction} />
              </div>
              <div>
                <SummaryMenu isFocus={isFocus} onRequestAI={requestAI} setInstruction={setInstruction} />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 有聊天记录时，聊天记录居中显示，input 底部显示 */}
      {(chatList.length > 0 || loading) && (
        <>
          <div className="flex-auto w-full p-2 overflow-y-auto" ref={chatListRef}>
            {chatList.map((chatItem, index) => {
              const { from, content } = chatItem
              if (from === 'user') {
                return <ChatItemUser key={chatItem.id} content={content} />
              }
              if (from === 'AI') {
                return (
                  <div key={chatItem.id}>
                    <ChatItemAI content={content} />
                    <ItemMenus
                      content={content}
                      loading={loading}
                      reRequestAI={index === chatList.length - 1 ? reRequestAI : undefined}
                    />
                  </div>
                )
              }
              return null
            })}
            {loading && <ChatItemUser content={instruction} />}
            {loading && <ChatItemAIGenerating content={AIResult} />}
          </div>
          <div className="w-full p-4">
            <AIInput
              isFocus={isFocus}
              loading={loading}
              onAbortRequestAI={abortRequestAI}
              onRequestAI={requestAI}
              instruction={instruction}
              setInstruction={setInstruction}
              delay={delay}
              chatList={chatList}
              ref={inputRef}
            />
          </div>
        </>
      )}
    </>
  )
}
