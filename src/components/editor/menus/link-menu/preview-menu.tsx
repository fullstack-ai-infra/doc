import { SquarePen, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type LinkPreviewMenuProps = {
  url: string
  onEdit: () => void
  onClear: () => void
}

export function LinkPreviewMenu(props: LinkPreviewMenuProps) {
  const { url, onEdit, onClear } = props

  return (
    <>
      <div className="inline-block max-w-[200px] text-nowrap overflow-hidden text-ellipsis pl-2 mt-1">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
          {url}
        </a>
      </div>
      <Button size="sm" onClick={onEdit} variant="ghost">
        <SquarePen className="h-4 w-4" />
      </Button>
      <Button size="sm" onClick={onClear} variant="ghost">
        <Unlink className="h-4 w-4" />
      </Button>
    </>
  )
}
