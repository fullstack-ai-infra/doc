import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import useDocs from '@/app/[locale]/work/[id]/hooks/useDocs'
import { useTranslations } from 'next-intl'

interface IProps {
  id: string
  className?: string
}

export default function DocDeleteButton(props: IProps) {
  const { id, className = '' } = props
  const { deleteDoc } = useDocs()
  const t = useTranslations('docItem')

  return (
    <Button
      variant="ghost"
      className={cn('w-full justify-start p-2 h-8 text-destructive', className)}
      onClick={() => deleteDoc(id)}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      {t('delete')}
    </Button>
  )
}
