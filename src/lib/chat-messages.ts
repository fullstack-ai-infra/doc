import type { UIMessage } from 'ai'

export interface ModelMessage {
  role: 'user' | 'system' | 'assistant'
  content: string
}

// ModelMessage（{ role, content }）→ UIMessage（AI SDK 格式，含 parts 数组）
export function toUIMessage(msg: ModelMessage): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: msg.role,
    parts: [{ type: 'text', text: msg.content }],
    metadata: undefined,
  }
}

// UIMessage → ModelMessage（如其他地方仍需旧格式时使用）
export function toModelMessage(msg: UIMessage): ModelMessage {
  const text = msg.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('')
  return { role: msg.role as ModelMessage['role'], content: text }
}
