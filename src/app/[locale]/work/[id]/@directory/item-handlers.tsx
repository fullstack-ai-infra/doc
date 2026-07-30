'use client'

import { Ellipsis } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import DocDeleteButton from '@/components/delete-doc-button'
import StarDocButton from '@/components/star-doc-button'
import DuplicateDocButton from '@/components/duplicate-doc-button'
import MoveDocButton from '@/components/move-doc-button'

interface IProps {
  id: string
}

export default function ItemHandlers(props: IProps) {
  const { id } = props

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer rounded-full p-1 hover:bg-active">
          <Ellipsis className="h-4 w-4" />
        </div>
      </PopoverTrigger>
      <PopoverContent className=" w-28 p-1">
        <StarDocButton id={id} className="w-full justify-start h-8 px-2" />
        <Separator className="my-1" />
        <DuplicateDocButton id={id} />
        <MoveDocButton id={id} />
        <Separator className="my-1" />
        <DocDeleteButton id={id} />
      </PopoverContent>
    </Popover>
  )
}
