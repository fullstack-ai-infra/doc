import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Link } from 'lucide-react'
import { LinkEditPanel } from '../link-menu/edit-panel'
import { useGetEditor } from '@/components/editor'

export default function SetLinkMenu() {
  const editor = useGetEditor()
  if (editor == null) return

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" tabIndex={-1}>
          <Link className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1">
        <LinkEditPanel
          onSetLink={(url: string, inNewTab?: boolean) =>
            editor
              .chain()
              .focus()
              .setLink({ href: url, target: inNewTab ? '_blank' : '' })
              .run()
          }
        />
      </PopoverContent>
    </Popover>
  )
}
