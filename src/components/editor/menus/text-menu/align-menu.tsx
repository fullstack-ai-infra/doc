'use client'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AlignCenter, AlignLeft, AlignRight, ChevronDown } from 'lucide-react'
import { useGetEditor } from '@/components/editor'

export default function AlignMenu() {
  const editor = useGetEditor()
  if (editor == null) return

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" tabIndex={-1}>
          <AlignLeft className="h-4 w-4" />
          &nbsp;
          <ChevronDown className="h-2 w-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <Button
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
          tabIndex={-1}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
          tabIndex={-1}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
          tabIndex={-1}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </PopoverContent>
    </Popover>
  )
}
