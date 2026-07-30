import { cn } from '@/lib/utils'

export default function Wrapper({
  children,
  className,
  menuType,
}: Readonly<{
  children: React.ReactNode
  className?: string
  menuType?: string
}>) {
  const initClassName = `border rounded p-1 shadow
  bg-background dark:bg-background-dark dark:border-gray-800 dark:shadow-lg 
  inline-flex`

  const conditionalClasses = menuType === 'table-menu' ? '' : 'space-x-1'

  return <div className={cn(initClassName, conditionalClasses, className)}>{children}</div>
}
