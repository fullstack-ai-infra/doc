'use client'

import { ListTodo } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGetEditor } from '@/components/editor'

// template json content
const TEMP_CONTENT = `{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"My todos"}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":true},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"item1"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"item2"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"item3"}]}]}]},{"type":"paragraph","attrs":{"textAlign":"left"}}]}`

export default function TodosTemplate() {
  const t = useTranslations('template')

  const editor = useGetEditor()

  function clickHandler() {
    if (editor === null) return
    editor.commands.setContent(JSON.parse(TEMP_CONTENT))
    editor.commands.focus()
  }

  return (
    <Card className="cursor-pointer" onClick={clickHandler}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium truncate">{t('todos')}</CardTitle>
        <ListTodo className="h-4 w-4 flex-shrink-0 text-green-600" />
      </CardHeader>
      <CardContent>
        <CardDescription className="truncate">{t('todosDesc')}</CardDescription>
      </CardContent>
    </Card>
  )
}
