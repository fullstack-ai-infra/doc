import { DOC_TITLE_INPUT_ID } from '@/constants'
import { MessagesType } from './hooks/useGenMessages'

// 将文本裁剪到最大长度：保留尾部内容并在开头补上 “...”。
export function trimTextKeepTail(text: string, maxChars: number): string {
  // 历史对话里通常越靠后的内容越相关，所以优先保留尾部。
  if (maxChars <= 0) return ''
  if (text.length <= maxChars) return text

  // maxChars 太小，没有空间同时放省略号和内容，退化为纯点号。
  if (maxChars <= 3) return '.'.repeat(maxChars)

  // 保证返回字符串长度严格等于 maxChars。
  return '...' + text.slice(-(maxChars - 3))
}

// 从 AI 面板 chatList 中提取最近 N 轮（user+assistant 成对）的历史消息，并按历史总字符预算裁剪。
export function buildHistoryMessages(
  chatList: Array<{ from: 'user' | 'AI'; content: string }>,
  turns: number,
  maxChars: number
): MessagesType {
  // 历史是可选的；遇到异常输入时，安全降级为“无历史”。
  if (!Array.isArray(chatList) || chatList.length === 0) return []
  if (turns <= 0 || maxChars <= 0) return []

  // 配对策略：
  // - 从尾部向前扫描，只接受相邻的 [user, AI] 配对。
  // - 使用 unshift 保持输出按时间正序（旧 -> 新）。
  const messages: MessagesType = []
  let pickedTurns = 0
  for (let i = chatList.length - 1; i >= 1 && pickedTurns < turns; i--) {
    const ai = chatList[i]
    const user = chatList[i - 1]
    if (ai?.from !== 'AI' || user?.from !== 'user') continue
    messages.unshift({ role: 'assistant', content: String(ai.content ?? '') })
    messages.unshift({ role: 'user', content: String(user.content ?? '') })
    pickedTurns++
    i-- // 跳过已配对的 user 消息。
  }

  const getTotal = (arr: MessagesType) => arr.reduce((sum, m) => sum + (m.content?.length ?? 0), 0)
  let total = getTotal(messages)
  if (total <= maxChars) return messages

  // 裁剪策略（只针对历史）：
  // 1) 若历史总字符超过 maxChars，则优先丢弃更旧的轮次（每轮 2 条），以保留最新上下文。
  let start = 0
  while (messages.length - start > 2 && total > maxChars) {
    total -= messages[start].content.length
    total -= messages[start + 1].content.length
    start += 2
  }

  const remaining = messages.slice(start)
  total = getTotal(remaining)
  if (total <= maxChars) return remaining

  // 2) 若仍超限（例如最后一条历史本身就很长），则只保留最新一条的尾部并加上 “...”。
  const last = remaining[remaining.length - 1]
  return [{ role: last.role, content: trimTextKeepTail(last.content, maxChars) }]
}

export function getTitle(): string {
  const titleInput = document.getElementById(DOC_TITLE_INPUT_ID) as HTMLInputElement
  return titleInput?.value || ''
}
