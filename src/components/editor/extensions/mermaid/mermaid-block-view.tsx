import MermaidRenderer from '@/components/mermaid-renderer'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import { Code2, Columns2, Eye } from 'lucide-react'
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

type ViewMode = 'split' | 'edit' | 'preview'

export default function MermaidBlockView(props: ReactNodeViewProps) {
  const { editor, getPos, node, updateAttributes, selected } = props
  const t = useTranslations('editor')
  const code = (node.attrs.code as string) || ''
  const [viewMode, setViewMode] = useState<ViewMode>('split')

  const onClick = useCallback(() => {
    editor.commands.setNodeSelection(getPos())
  }, [editor.commands, getPos])

  const changeViewMode = useCallback((event: React.MouseEvent<HTMLButtonElement>, mode: ViewMode) => {
    event.stopPropagation()
    setViewMode(mode)
  }, [])

  const editorPanel = (
    <textarea
      className="h-full min-h-72 w-full resize-none rounded border bg-muted/40 p-3 font-mono text-xs leading-relaxed outline-none focus:border-blue-500"
      value={code}
      spellCheck={false}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => updateAttributes({ code: event.target.value })}
    />
  )

  const previewPanel = (
    <div className="h-full min-h-72 overflow-auto rounded border bg-white p-3 dark:bg-gray-950">
      <MermaidRenderer code={code} className="flex min-h-64 items-center justify-center [&_svg]:max-w-full" />
    </div>
  )

  return (
    <NodeViewWrapper
      data-type="mermaid-block"
      className={cn(
        'my-4 rounded border bg-background p-3',
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-border'
      )}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t('mermaidDiagram')}</span>
        <div className="flex rounded border bg-muted/30 p-0.5">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'split' ? 'secondary' : 'ghost'}
            className="h-7 px-2"
            title={t('mermaidSplitView')}
            aria-label={t('mermaidSplitView')}
            onClick={(event) => changeViewMode(event, 'split')}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
            className="h-7 px-2"
            title={t('mermaidEditOnly')}
            aria-label={t('mermaidEditOnly')}
            onClick={(event) => changeViewMode(event, 'edit')}
          >
            <Code2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
            className="h-7 px-2"
            title={t('mermaidPreviewOnly')}
            aria-label={t('mermaidPreviewOnly')}
            onClick={(event) => changeViewMode(event, 'preview')}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {viewMode === 'split' && (
        <ResizablePanelGroup direction="horizontal" className="min-h-72 rounded">
          <ResizablePanel defaultSize={50} minSize={30}>
            {editorPanel}
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-2" />
          <ResizablePanel defaultSize={50} minSize={30}>
            {previewPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
      {viewMode === 'edit' && editorPanel}
      {viewMode === 'preview' && previewPanel}
    </NodeViewWrapper>
  )
}
