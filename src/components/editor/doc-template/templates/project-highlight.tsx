'use client'

import { Lightbulb } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGetEditor } from '@/components/editor'

const TEMP_CONTENT_EN = `{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"In interviews, to highlight project accomplishments, it is recommended to use the STAR method:"}]},{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"text","text":"Situation"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"This is a xxx project that is currently facing an xxx requirement, based on the xxx background..."}]},{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"text","text":"Task"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"I have to design and develop the xxx function or to solve the xxx problem, including what the difficulties are..."}]},{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"text","text":"Action"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"I conducted xxx research for this, reached the conclusion of xxx, and used the xxx technical solution to address the xxx issue..."}]},{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"text","text":"Result"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"After resolving the issue, the project achieved xxx results, and I gained xxx insights..."}]},{"type":"paragraph","attrs":{"textAlign":"left"}}]}`
const TEMP_CONTENT_CN = `{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"在面试中表达项目亮点，推荐使用 "},{"type":"text","text":"STAR","marks":[{"type":"bold","attrs":{}}]},{"type":"text","text":" 模式："}]},{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"text","text":"Situation 背景"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"这是一个 xxx 项目，当前遇到了 xxx 需求，基于 xxx 背景..."}]},{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"text","text":"Task 任务"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"我需要设计开发 xxx 功能，或解决 xxx 问题，难点有什么..."}]},{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"text","text":"Action 行动"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"我为此做了 xxx 调研，得出 xxx 结论，使用 xxx 技术方案解决了 xxx 问题..."}]},{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"text","text":"Result 结果"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"问题解决以后，项目达到了 xxx 效果，我得到了 xxx 收获..."}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[]}]}`

export default function ProjectHighLightTemplate() {
  const t = useTranslations('template')
  const locale = useLocale()

  const editor = useGetEditor()

  function clickHandler() {
    if (editor === null) return
    editor.commands.setContent(locale === 'zh-cn' ? JSON.parse(TEMP_CONTENT_CN) : JSON.parse(TEMP_CONTENT_EN))
    editor.commands.focus()
  }

  return (
    <Card className="cursor-pointer" onClick={clickHandler}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium truncate">{t('projectHighlight')}</CardTitle>
        <Lightbulb className="h-4 w-4 flex-shrink-0 text-yellow-500" />
      </CardHeader>
      <CardContent>
        <CardDescription className="truncate">{t('projectHighlightDesc')}</CardDescription>
      </CardContent>
    </Card>
  )
}
