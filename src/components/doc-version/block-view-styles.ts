import { cn } from '@/lib/utils'

export type StaticTextBlockKind = 'heading' | 'paragraph' | 'listItem' | 'taskItem' | 'blockquote'

export function getStaticTextBlockClass(kind: StaticTextBlockKind) {
  return cn(
    'w-full max-w-full min-w-0 px-3 text-foreground whitespace-pre-wrap [overflow-wrap:anywhere]',
    ['listItem', 'taskItem'].includes(kind) ? 'py-1' : 'py-2',
    kind === 'blockquote' && 'border-l-2 border-muted-foreground/30 pl-3 italic'
  )
}

export function getStaticHeadingClass(level: number) {
  if (level === 1) return 'text-4xl font-bold focus-visible:ring-transparent'
  if (level === 2) return 'text-3xl font-semibold'
  return 'text-2xl font-semibold'
}

export function getStaticCodeBlockClass() {
  return 'rounded-md bg-black/80 px-3 py-2 text-xs text-white whitespace-pre-wrap [overflow-wrap:anywhere]'
}

export function getStaticMermaidCodeClass() {
  return 'rounded-md bg-black/80 px-3 py-2 text-xs text-white whitespace-pre-wrap'
}

export function getStaticContainerBlockClass() {
  return 'rounded-md px-3 py-1 text-foreground'
}

export function getStaticColumnGroupClass() {
  return 'grid gap-4 mt-2 mb-2'
}

export function getStaticColumnLayoutClass(layout: string) {
  if (layout === 'sidebar-left') return 'md:grid-cols-[40fr_60fr]'
  if (layout === 'sidebar-right') return 'md:grid-cols-[60fr_40fr]'
  return 'md:grid-cols-2'
}

export function getStaticColumnClass(withBorder: boolean) {
  if (!withBorder) return 'border-none px-0 py-0 overflow-auto'

  return 'rounded border-2 border-dotted border-black/10 px-3 py-1 overflow-auto dark:border-neutral-500'
}

export function getStaticTableWrapperClass() {
  return 'my-3 overflow-x-auto'
}

export function getStaticTableClass() {
  return 'min-w-full w-full border-collapse box-border border-black/10 dark:border-white/20'
}

export function getStaticTableCellClass(isHeader: boolean) {
  return cn(
    'border border-black/10 min-w-[100px] px-3 py-1.5 text-left align-top dark:border-white/20',
    isHeader && 'bg-muted/60 font-bold'
  )
}

export function getStaticImageAlignClass(align?: string) {
  return cn(
    align === 'left' ? 'ml-0' : 'ml-auto',
    align === 'right' ? 'mr-0' : 'mr-auto',
    align === 'center' && 'mx-auto'
  )
}

export function getStaticImageClass() {
  return 'block rounded-md border object-contain'
}

export function getStaticTaskCheckboxClass(checked: boolean) {
  return cn(
    'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[11px] leading-none',
    checked ? 'border-[#1677ff] bg-[#1677ff] text-white' : 'border-muted-foreground/40 bg-background text-transparent'
  )
}
