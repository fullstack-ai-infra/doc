import { Button } from '@/components/ui/button'
import { Bold, Italic, Code, Underline } from 'lucide-react'
import { useGetEditor } from '@/components/editor'

export default function BasicMenu() {
  const editor = useGetEditor()
  if (editor == null) return

  return (
    <>
      <Button
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        tabIndex={-1}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
        tabIndex={-1}
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        tabIndex={-1}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        variant={editor.isActive('code') ? 'secondary' : 'ghost'}
        tabIndex={-1}
      >
        <Code className="h-4 w-4" />
      </Button>
    </>
  )
}
