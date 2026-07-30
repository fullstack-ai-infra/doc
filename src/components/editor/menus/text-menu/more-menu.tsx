import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Ellipsis, Superscript, Subscript, Strikethrough } from 'lucide-react'
import { useGetEditor } from '@/components/editor'

export default function MoreMenu() {
  const editor = useGetEditor()
  if (editor == null) return

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" tabIndex={-1}>
          <Ellipsis className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <Button
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
          tabIndex={-1}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          variant={editor.isActive('superscript') ? 'secondary' : 'ghost'}
          tabIndex={-1}
        >
          <Superscript className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          variant={editor.isActive('subscript') ? 'secondary' : 'ghost'}
          tabIndex={-1}
        >
          <Subscript className="h-4 w-4" />
        </Button>
      </PopoverContent>
    </Popover>
  )
}
