import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Brush, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useGetEditor } from '@/components/editor'

export default function HighlightMenu() {
  const editor = useGetEditor()
  if (editor == null) return

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" tabIndex={-1}>
          <Brush className="h-4 w-4" />
          &nbsp;
          <ChevronDown className="h-2 w-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <ColorPanel />
      </PopoverContent>
    </Popover>
  )
}

function ColorPanel() {
  const t = useTranslations('colors')
  const editor = useGetEditor()

  if (editor == null) return

  const colors = [
    { name: t('orange'), color: '#ffc078' },
    { name: t('green'), color: '#8ce99a' },
    { name: t('blue'), color: '#74c0fc' },
    { name: t('purple'), color: '#b197fc' },
    { name: t('red'), color: 'red' },
  ]
  const ItemClassName = 'block px-3 py-1 m-1'

  return (
    <>
      {colors.map((item) => (
        <Button
          key={item.color}
          className={ItemClassName}
          size="sm"
          style={{ background: item.color }}
          onClick={() => editor.chain().focus().setHighlight({ color: item.color }).run()}
          tabIndex={-1}
        >
          {item.name}
        </Button>
      ))}
      <Button
        className={ItemClassName}
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().unsetHighlight().run()}
        tabIndex={-1}
      >
        {t('clear')}
      </Button>
    </>
  )
}
