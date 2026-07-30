import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronsUpDown } from 'lucide-react'
import { useContentType } from './useContentType'
import { useGetEditor } from '@/components/editor'

export default function ContentTypeMenu() {
  const editor = useGetEditor()
  const options = useContentType(editor)

  if (editor == null) return

  function getLabel() {
    const item = options.find((op) => op.isActive())
    return item?.label ?? '段落'
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" tabIndex={-1}>
          {getLabel()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        {options.map((op) => (
          <Button
            key={op.id}
            disabled={op.disabled()}
            variant="ghost"
            size="sm"
            onClick={op.onClick}
            className="flex w-full rounded-none"
            tabIndex={-1}
          >
            <op.Icon />
            {op.label}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
