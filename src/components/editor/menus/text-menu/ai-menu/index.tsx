import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sparkles, ChevronDown } from 'lucide-react'
import MakeLongerMenu from './make-longer-menu'
import MakeShorterMenu from './make-shorter-menu'
import ExplainMenu from './explain-menu'
import ChangeToneMenu from './change-tone-menu'
import TranslateMenu from './translate-menu'

export default function AIMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" tabIndex={-1} className="text-blue-500 hover:text-blue-500">
          <Sparkles className="h-4 w-4 mr-1" />
          Ask AI
          <ChevronDown className="h-2 w-2 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto py-1 px-2">
        <div className="flex flex-col">
          <MakeLongerMenu />
          <MakeShorterMenu />
          <ChangeToneMenu />
          <TranslateMenu />
          <ExplainMenu />
        </div>
      </PopoverContent>
    </Popover>
  )
}
