import { cn } from '@/lib/utils'

export default async function Footer(props: { className?: string }) {
  const { className } = props
  const year = new Date().getFullYear()
  return (
    <footer className={cn('w-full shrink-0 border-t border-border px-4 py-6 md:px-6', className)}>
      <p className="text-center text-xs text-muted-foreground">©{year} fullstack-ai-infra / doc</p>
    </footer>
  )
}
