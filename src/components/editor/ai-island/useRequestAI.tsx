import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { MessagesType } from './hooks/useGenMessages'
import { AI_REQUEST_DELAY, AI_RES_MAX_TOKENS } from '@/constants'
import { useEditorStore } from '@/stores/editor-store'
import { useTranslations } from 'next-intl'
import { toModelMessage, toUIMessage } from '@/lib/chat-messages'

interface IParams {
  loading: boolean
  setAIResult: React.Dispatch<React.SetStateAction<string>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setInstruction: React.Dispatch<React.SetStateAction<string>>
  delay: number
  setDelay: React.Dispatch<React.SetStateAction<number>>
  initialMessages?: UIMessage[]
}

export default function useRequestAI(params: IParams) {
  const { loading, setAIResult, setLoading, setInstruction, delay, setDelay, initialMessages } = params

  const [prevMessages, setPrevMessages] = useState<MessagesType>([])
  const { toast } = useToast()
  const t = useTranslations('AIInput')
  const AITokenLimit = useEditorStore((s) => s.AITokenLimit)
  const setAITokenLimit = useEditorStore((s) => s.setAITokenLimit)
  const requestStartLengthRef = useRef(0)
  const restoredHistoryMessagesRef = useRef<UIMessage[] | undefined>(undefined)

  const {
    messages: chatMessages,
    sendMessage,
    stop,
    status,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/gpt/chat',
      prepareSendMessagesRequest(request) {
        return {
          body: {
            messages: request.messages,
            max_tokens: AI_RES_MAX_TOKENS,
          },
        }
      },
    }),
    onFinish({ message }) {
      setLoading(false)
      setDelay(AI_REQUEST_DELAY)

      const metadata = (message.metadata ?? {}) as { totalTokens?: number }
      const totalTokens = metadata.totalTokens ?? 0
      if (AITokenLimit != null && totalTokens > 0) {
        setAITokenLimit(Math.max(AITokenLimit - totalTokens, 0))
      }
    },
    onError(error) {
      setLoading(false)
      toast({
        variant: 'destructive',
        title: t('somethingWrong'),
        description: error.message,
        action: <ToastAction altText="OK">OK</ToastAction>,
      })
    },
  })

  // 最后一条 message
  const lastMessage = chatMessages[chatMessages.length - 1]
  // message 总个数
  const messageCount = chatMessages.length

  useEffect(() => {
    if (restoredHistoryMessagesRef.current === initialMessages) return
    restoredHistoryMessagesRef.current = initialMessages
    setMessages(initialMessages || [])
  }, [initialMessages, setMessages])

  useEffect(() => {
    // 在最后一条 message 的类型是 assistant 的时候，设置 AI 回答的文本
    // 处理 submitted 状态
    if (status === 'submitted') return
    // 判断最后一条 message 的类型
    if (lastMessage?.role !== 'assistant') return
    // 判断 message 总个数是否大于历史消息个数 requestStartLengthRef，大于才继续往下走，避免读取到历史的 assistant 消息
    if (messageCount <= requestStartLengthRef.current) return

    // 读取最后一条消息的文本内容
    const text = toModelMessage(lastMessage).content

    // 设置 AI 回答文本
    if (text) setAIResult(text)
  }, [lastMessage, messageCount, setAIResult, status])

  function requestAI(customMessages: MessagesType) {
    if (!customMessages || customMessages.length === 0) return
    if (loading) return
    if (delay > 0) {
      toast({
        title: 'Alert',
        description: t('waitSeconds', { seconds: delay }),
        action: <ToastAction altText="OK">OK</ToastAction>,
      })
      return
    }
    if (AITokenLimit != null && AITokenLimit <= 0) {
      toast({
        variant: 'destructive',
        title: t('somethingWrong'),
        description: t('exceedLimit'),
        action: <ToastAction altText="OK">OK</ToastAction>,
      })
      return
    }

    // 用户最新发送的 message
    const lastUserMsg = customMessages.at(-1)
    if (!lastUserMsg) return
    // 去掉最新用户 message 后的 message 列表，从 ModelMessage 类型转换为 toUIMessage 类型，作为历史 message 列表
    const historyMessages = customMessages.slice(0, -1).map(toUIMessage)

    setPrevMessages(customMessages)
    setAIResult('')
    setLoading(true)
    // 记录历史 message 列表长度，用于 setAIResult 里作判断
    requestStartLengthRef.current = historyMessages.length
    // 设置 messages state 的初始值
    setMessages(historyMessages)
    // 发送消息，触发 /api/gpt/chat 调用
    sendMessage({ text: lastUserMsg.content })
  }

  function abortRequestAI() {
    stop()
    setLoading(false)
  }

  function reRequestAI() {
    requestAI(prevMessages)
  }

  return { requestAI, abortRequestAI, reRequestAI }
}
