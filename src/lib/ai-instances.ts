import 'server-only'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { sendEmail } from '@/lib/mailer'

interface AIInstance {
  provider: ReturnType<typeof createOpenAICompatible>
  model: string
  key: string
  isError: boolean
}

const instanceList: AIInstance[] = [
  {
    provider: createOpenAICompatible({
      name: 'deepseek',
      apiKey: process.env.DEEP_SEEK_API_KEY || '',
      baseURL: 'https://api.deepseek.com',
      includeUsage: true,
    }),
    model: 'deepseek-chat',
    key: process.env.DEEP_SEEK_API_KEY || '',
    isError: false,
  },
  {
    provider: createOpenAICompatible({
      name: 'deepbricks',
      apiKey: process.env.DEEP_BRICKS_API_KEY || '',
      baseURL: 'https://api.deepbricks.ai/v1/',
      includeUsage: true,
    }),
    model: 'gpt-3.5-turbo',
    key: process.env.DEEP_BRICKS_API_KEY || '',
    isError: false,
  },
]

let index = 0

export function getAIInstance(): AIInstance | null {
  const total = instanceList.length
  if (total === 0) {
    sendEmail({ subject: 'AI instance list is empty', text: 'All instances failed.' })
    return null
  }
  for (let i = 0; i < total; i++) {
    const candidate = instanceList[index % total]
    index++
    if (!candidate.isError) return candidate
  }
  // 全部报错时重置，避免永久不可用
  instanceList.forEach((ins) => (ins.isError = false))
  sendEmail({ subject: 'All AI instances failed', text: 'Reset all instances.' })
  index = 0
  return instanceList[0] ?? null
}
