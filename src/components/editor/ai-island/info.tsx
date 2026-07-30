'use client'

import { Link } from '@/i18n/routing'
import { useEffect, CSSProperties } from 'react'
import { get, IAjaxRes } from '@/lib/ajax'
import { useEditorStore } from '@/stores/editor-store'
import { useTranslations } from 'next-intl'

interface IProps {
  style?: CSSProperties
}

export default function Info(props: IProps) {
  const AITokenLimit = useEditorStore((s) => s.AITokenLimit)
  const setAITokenLimit = useEditorStore((s) => s.setAITokenLimit)
  const t = useTranslations('AIInput')

  useEffect(() => {
    if (AITokenLimit != null) return
    // console.log('get token limit...')
    const url = '/api/gpt/token-usage'
    get(url).then((res: IAjaxRes) => {
      if (res.errno !== 0) {
        console.error('Get token usage failed', res.msg)
        return
      }
      const { data } = res
      const { tokensLimit = 0 } = data || {}
      setAITokenLimit(tokensLimit)
    })
  }, [AITokenLimit, setAITokenLimit])

  return (
    <p className="text-sm text-center my-1 text-muted-foreground" style={props.style}>
      {t('mistakeTip')}.&nbsp;
      {t.rich('limitTip', {
        limit: (chunks: any) => (
          <Link href="/ai-token" className="underline" title={t('whatIsLimit')}>
            {chunks}
          </Link>
        ),
      })}
      <TokenLimitSpan tokenLimit={AITokenLimit} /> .&nbsp;
      <Link href="/ai-token#add-limit-heading" className="underline">
        {t('clickToGetMore')}
      </Link>
    </p>
  )
}

function TokenLimitSpan({ tokenLimit }: { tokenLimit: number | null }) {
  if (tokenLimit === null) return <span>---</span>
  let color = 'text-green-500'
  if (tokenLimit < 3000) color = 'text-orange-500'
  if (tokenLimit < 1000) color = 'text-red-500'
  if (tokenLimit < 0) return <span>---</span>
  return <span className={`${color} font-bold`}>{tokenLimit}</span>
}
