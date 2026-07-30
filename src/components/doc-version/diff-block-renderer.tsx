'use client'

/* eslint-disable @next/next/no-img-element -- Diff previews preserve user-authored image URLs that are not known at build time. */

import { cn } from '@/lib/utils'
import { RenderBlock } from '@/lib/doc-version/block-diff'
import { DiffSegment } from '@/lib/doc-version/diff'
import {
  getStaticCodeBlockClass,
  getStaticColumnClass,
  getStaticColumnGroupClass,
  getStaticColumnLayoutClass,
  getStaticContainerBlockClass,
  getStaticHeadingClass,
  getStaticImageAlignClass,
  getStaticImageClass,
  getStaticMermaidCodeClass,
  getStaticTaskCheckboxClass,
  getStaticTableCellClass,
  getStaticTableClass,
  getStaticTableWrapperClass,
  getStaticTextBlockClass,
} from './block-view-styles'

// Diff 语义颜色系统 - 统一的 token 定义
// 所有 diff 相关的颜色都通过这里管理，确保一致性
const diffStyles = {
  added: {
    bg: 'bg-emerald-50',
    bgSubtle: 'bg-emerald-50/50',
    text: 'text-emerald-900',
    textSubtle: 'text-emerald-700',
    segment: 'bg-emerald-100 text-emerald-950',
  },
  removed: {
    bg: 'bg-red-50',
    bgSubtle: 'bg-red-50/50',
    text: 'text-red-900',
    textSubtle: 'text-red-700',
    segment: 'bg-red-100 text-red-900 line-through',
  },
  modified: {
    bg: 'bg-amber-50',
    bgSubtle: 'bg-amber-50/70',
    text: 'text-amber-900',
    textSubtle: 'text-amber-700',
    segment: 'bg-amber-100 text-amber-950',
  },
  unchanged: {
    bg: '',
    bgSubtle: '',
    text: 'text-foreground',
    textSubtle: 'text-muted-foreground',
    segment: '',
  },
} as const

// 按块类型渲染版本差异预览，保持正文结构而不是全部压平为纯文本。
export default function DiffBlockRenderer(props: { block: RenderBlock }) {
  const { block } = props
  const changeClassName = getBlockChangeClassName(block.kind, block.changeType)
  const content = renderSegments(block.segments)

  if (block.kind === 'heading') {
    const level = Number(block.attrs?.level || 1)
    const HeadingTag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
    const headingClassName = cn(getStaticTextBlockClass('heading'), getStaticHeadingClass(level), changeClassName)
    return <HeadingTag className={headingClassName}>{content}</HeadingTag>
  }

  if (block.kind === 'listItem') {
    return (
      <div className={cn(getStaticTextBlockClass('listItem'), 'flex gap-2', changeClassName)}>
        <span className="text-muted-foreground">•</span>
        <span className="min-w-0 flex-1">{content}</span>
      </div>
    )
  }

  if (block.kind === 'taskItem') {
    const checked = Boolean(block.attrs?.checked)
    return (
      <div className={cn(getStaticTextBlockClass('taskItem'), 'flex items-center gap-2', changeClassName)}>
        <span aria-hidden="true" className={getStaticTaskCheckboxClass(checked)}>
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <span className={checked ? 'line-through' : ''}>{content}</span>
        </div>
      </div>
    )
  }

  if (block.kind === 'blockquote') {
    return <blockquote className={cn(getStaticTextBlockClass('blockquote'), changeClassName)}>{content}</blockquote>
  }

  if (block.kind === 'codeBlock') {
    return (
      <div className={cn(getStaticContainerBlockClass(), changeClassName)}>
        <pre className={getStaticCodeBlockClass()}>{content}</pre>
      </div>
    )
  }

  if (block.kind === 'mermaidBlock') {
    return (
      <div className={cn(getStaticContainerBlockClass(), 'space-y-2', changeClassName)}>
        <p className="text-xs text-muted-foreground">Mermaid 图源码</p>
        <pre className={getStaticMermaidCodeClass()}>{content}</pre>
      </div>
    )
  }

  if (block.kind === 'horizontalRule') {
    return (
      <div className={cn(getStaticContainerBlockClass(), changeClassName)}>
        {block.changeType === 'added' && <p className="mb-2 text-xs text-muted-foreground">新增分割线</p>}
        {block.changeType === 'removed' && <p className="mb-2 text-xs text-muted-foreground">已删除分割线</p>}
        <hr className="border-border" />
      </div>
    )
  }

  if (block.kind === 'imageBlock') {
    const src = typeof block.attrs?.src === 'string' ? block.attrs.src : ''
    const previousSrc = typeof block.attrs?.previousSrc === 'string' ? block.attrs.previousSrc : ''
    const width = typeof block.attrs?.width === 'string' ? block.attrs.width : undefined
    const imageChangeType = typeof block.attrs?.imageChangeType === 'string' ? block.attrs.imageChangeType : 'unchanged'
    const align = typeof block.attrs?.align === 'string' ? block.attrs.align : undefined

    return (
      <div className={cn(getStaticContainerBlockClass(), 'space-y-2', changeClassName)}>
        {imageChangeType === 'replaced' && <p className="text-xs text-muted-foreground">图片已替换</p>}
        {imageChangeType === 'replaced' && previousSrc ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border bg-red-50 p-2">
              <p className="mb-2 text-xs text-muted-foreground">旧版本</p>
              <img
                src={previousSrc}
                alt="旧版本图片"
                className={cn(getStaticImageClass(), getStaticImageAlignClass(align))}
                style={width ? { width } : undefined}
              />
            </div>
            <div className="rounded-md border bg-emerald-50 p-2">
              <p className="mb-2 text-xs text-muted-foreground">新版本</p>
              <img
                src={src}
                alt="新版本图片"
                className={cn(getStaticImageClass(), getStaticImageAlignClass(align))}
                style={width ? { width } : undefined}
              />
            </div>
          </div>
        ) : src ? (
          <img
            src={src}
            alt="版本图片"
            className={cn(getStaticImageClass(), getStaticImageAlignClass(align))}
            style={width ? { width } : undefined}
          />
        ) : (
          <p className="text-xs text-muted-foreground">图片内容</p>
        )}
      </div>
    )
  }

  if (block.kind === 'table') {
    return (
      <div className={cn(getStaticTableWrapperClass(), changeClassName)}>
        <table className={getStaticTableClass()}>
          <tbody>
            {block.children?.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.children?.map((cell, cellIndex) => (
                  <TableCellBlock key={`cell-${rowIndex}-${cellIndex}`} cell={cell} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (block.kind === 'columnGroup') {
    const layout = getStaticColumnLayoutClass(String(block.attrs?.layout || 'two-column'))
    const withBorder = Boolean(block.attrs?.withBorder)

    return (
      <div className={cn(getStaticColumnGroupClass(), layout, changeClassName)}>
        {block.children?.map((column, index) => (
          <div
            key={`column-${index}`}
            className={cn(getStaticColumnClass(withBorder), getBlockChangeClassName(column.kind, column.changeType))}
          >
            <div className="space-y-2">
              {column.children?.map((child, childIndex) => (
                <DiffBlockRenderer key={`${child.kind}-${childIndex}`} block={child} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <p className={cn(getStaticTextBlockClass('paragraph'), changeClassName)}>{content}</p>
}

// 为不同变化类型提供统一的块级装饰样式。
function getBlockChangeClassName(kind: RenderBlock['kind'], changeType: RenderBlock['changeType']) {
  const textLikeKinds: RenderBlock['kind'][] = ['heading', 'paragraph', 'listItem', 'taskItem', 'blockquote']
  const style = diffStyles[changeType]

  if (textLikeKinds.includes(kind)) {
    return style.bgSubtle
  }

  return style.bg
}

// 按分段高亮文本级变化，作为块内 diff 的统一表现形式。
function renderSegments(segments?: DiffSegment[]) {
  if (!segments?.length) return null

  return segments.map((segment, index) => {
    const style =
      segment.type === 'added' ? diffStyles.added.segment : segment.type === 'removed' ? diffStyles.removed.segment : ''

    return (
      <span key={`${segment.type}-${index}-${segment.text}`} className={style}>
        {segment.text}
      </span>
    )
  })
}

// 表格单元格根据变化类型应用更聚焦的背景色，便于扫描差异。
function getTableCellClassName(changeType: RenderBlock['changeType']) {
  const style = diffStyles[changeType]
  return style.bgSubtle || 'bg-background'
}

// 按是否为表头决定单元格标签和表格语义样式。
function TableCellBlock(props: { cell: RenderBlock }) {
  const { cell } = props
  const isHeader = Boolean(cell.attrs?.isHeader)
  const className = cn(getStaticTableCellClass(isHeader), getTableCellClassName(cell.changeType))

  if (isHeader) {
    return <th className={className}>{renderSegments(cell.segments)}</th>
  }

  return <td className={className}>{renderSegments(cell.segments)}</td>
}
