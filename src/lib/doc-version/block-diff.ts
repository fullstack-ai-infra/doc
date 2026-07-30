import { buildTextDiffSegments, DiffSegment } from './diff'

export interface TiptapNodeLike {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  content?: TiptapNodeLike[]
}

export type DocVersionBlockKind =
  | 'heading'
  | 'paragraph'
  | 'listItem'
  | 'taskItem'
  | 'blockquote'
  | 'codeBlock'
  | 'mermaidBlock'
  | 'horizontalRule'
  | 'imageBlock'
  | 'table'
  | 'tableRow'
  | 'tableCell'
  | 'columnGroup'
  | 'column'

export type DocVersionBlockChangeType = 'unchanged' | 'modified' | 'added' | 'removed'

interface DiffBlockModel {
  kind: DocVersionBlockKind
  text?: string
  attrs?: Record<string, unknown>
  children?: DiffBlockModel[]
}

export interface RenderBlock {
  kind: DocVersionBlockKind
  changeType: DocVersionBlockChangeType
  text?: string
  attrs?: Record<string, unknown>
  segments?: DiffSegment[]
  children?: RenderBlock[]
}

// 基于 Tiptap JSON 构建块级版本预览 diff，提升正文差异的结构可读性。
export function buildRenderBlocks(previousContent: string, currentContent: string) {
  const previousBlocks = normalizeDocument(parseDoc(previousContent))
  const currentBlocks = normalizeDocument(parseDoc(currentContent))
  return matchBlocks(previousBlocks, currentBlocks).map(({ previous, current }) => classifyPair(previous, current))
}

// 将 JSON 字符串解析成文档节点，解析失败时退化为空文档。
function parseDoc(content: string): TiptapNodeLike | null {
  try {
    return JSON.parse(content) as TiptapNodeLike
  } catch (ex) {
    return null
  }
}

// 归一化文档节点，将正文转换为更适合做版本比对的块列表。
function normalizeDocument(doc: TiptapNodeLike | null | undefined) {
  if (!doc?.content?.length) return []

  const blocks: DiffBlockModel[] = []
  doc.content.forEach((node) => {
    blocks.push(...normalizeNode(node))
  })
  return blocks
}

// 递归归一化节点，只保留当前版本预览需要的几类块结构。
function normalizeNode(node: TiptapNodeLike): DiffBlockModel[] {
  switch (node.type) {
    case 'heading':
      return [createTextBlock('heading', node, { level: node.attrs?.level })]
    case 'paragraph':
      return [createTextBlock('paragraph', node)]
    case 'blockquote':
      return [createTextBlock('blockquote', node)]
    case 'codeBlock':
      return [createTextBlock('codeBlock', node)]
    case 'mermaidBlock':
      return [
        {
          kind: 'mermaidBlock',
          text: String(node.attrs?.code || '').trim(),
        },
      ]
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
      return (node.content || []).flatMap((child) => normalizeNode(child))
    case 'listItem':
      return [{ kind: 'listItem', text: extractListItemText(node) }]
    case 'taskItem':
      return [
        {
          kind: 'taskItem',
          text: extractText(node).trim(),
          attrs: { checked: Boolean(node.attrs?.checked) },
        },
      ]
    case 'horizontalRule':
      return [{ kind: 'horizontalRule' }]
    case 'imageBlock':
      return [
        {
          kind: 'imageBlock',
          attrs: {
            src: node.attrs?.src,
            width: node.attrs?.width,
            align: node.attrs?.align,
            ratio: node.attrs?.ratio,
            alt: node.attrs?.alt,
          },
        },
      ]
    case 'table':
      return [
        {
          kind: 'table',
          children: (node.content || []).map((row) => normalizeTableRow(row)),
        },
      ]
    case 'columns':
      return [
        {
          kind: 'columnGroup',
          attrs: {
            layout: node.attrs?.layout,
            withBorder: node.attrs?.withBorder,
          },
          children: (node.content || []).map((column) => normalizeColumn(column)),
        },
      ]
    case 'column':
      return [normalizeColumn(node)]
    default:
      return (node.content || []).flatMap((child) => normalizeNode(child))
  }
}

// 构建文本类块，统一提取文本与块属性。
function createTextBlock(
  kind: DiffBlockModel['kind'],
  node: TiptapNodeLike,
  attrs?: Record<string, unknown>
): DiffBlockModel {
  return {
    kind,
    text: extractText(node).trim(),
    attrs,
  }
}

// 提取 listItem 的首层段落文本，避免把嵌套列表完全压扁。
function extractListItemText(node: TiptapNodeLike) {
  return (node.content || [])
    .filter((child) => child.type === 'paragraph')
    .map((child) => extractText(child))
    .join(' ')
    .trim()
}

// 递归提取节点文本内容，供块归一化和块内 diff 使用。
function extractText(node: TiptapNodeLike): string {
  if (node.type === 'text') return node.text || ''
  if (!node.content?.length) return ''
  return node.content.map((child) => extractText(child)).join('')
}

// 将表格行归一化成可递归比较的行/单元格结构。
function normalizeTableRow(node: TiptapNodeLike): DiffBlockModel {
  return {
    kind: 'tableRow',
    children: (node.content || []).map((cell) => ({
      kind: 'tableCell',
      text: extractText(cell).trim(),
      attrs: {
        isHeader: cell.type === 'tableHeader',
        colspan: cell.attrs?.colspan,
        rowspan: cell.attrs?.rowspan,
      },
    })),
  }
}

// 将分栏节点归一化成容器结构，保留左右列及布局属性。
function normalizeColumn(node: TiptapNodeLike): DiffBlockModel {
  return {
    kind: 'column',
    attrs: {
      position: node.attrs?.position,
    },
    children: (node.content || []).flatMap((child) => normalizeNode(child)),
  }
}

// 匹配前后两个版本的块序列，优先保持结构和阅读顺序稳定。
function matchBlocks(previousBlocks: DiffBlockModel[], currentBlocks: DiffBlockModel[]) {
  const pairs: Array<{ previous?: DiffBlockModel; current?: DiffBlockModel }> = []
  let previousIndex = 0
  let currentIndex = 0

  while (previousIndex < previousBlocks.length || currentIndex < currentBlocks.length) {
    const previous = previousBlocks[previousIndex]
    const current = currentBlocks[currentIndex]

    if (!previous) {
      pairs.push({ current })
      currentIndex += 1
      continue
    }

    if (!current) {
      pairs.push({ previous })
      previousIndex += 1
      continue
    }

    if (canMatch(previous, current)) {
      pairs.push({ previous, current })
      previousIndex += 1
      currentIndex += 1
      continue
    }

    const nextCurrentOffset = findLookahead(currentBlocks, currentIndex + 1, previous)
    const nextPreviousOffset = findLookahead(previousBlocks, previousIndex + 1, current)

    if (nextCurrentOffset !== -1 && (nextPreviousOffset === -1 || nextCurrentOffset <= nextPreviousOffset)) {
      pairs.push({ current })
      currentIndex += 1
      continue
    }

    if (nextPreviousOffset !== -1) {
      pairs.push({ previous })
      previousIndex += 1
      continue
    }

    pairs.push({ previous, current })
    previousIndex += 1
    currentIndex += 1
  }

  return pairs
}

// 在有限窗口内前瞻匹配，减少局部插删导致的整段错位。
function findLookahead(blocks: DiffBlockModel[], startIndex: number, target: DiffBlockModel) {
  const endIndex = Math.min(startIndex + 3, blocks.length)
  for (let index = startIndex; index < endIndex; index += 1) {
    if (canMatch(target, blocks[index])) {
      return index - startIndex + 1
    }
  }
  return -1
}

// 判断两个块是否可以视为同一位置上的可比较块。
function canMatch(previous: DiffBlockModel, current: DiffBlockModel) {
  if (previous.kind !== current.kind) return false
  if (previous.kind === 'horizontalRule') return true
  if (previous.kind === 'imageBlock') return true
  if (previous.kind === 'columnGroup') {
    return previous.children?.length === current.children?.length && previous.attrs?.layout === current.attrs?.layout
  }
  if (previous.kind === 'column') {
    return previous.attrs?.position === current.attrs?.position
  }
  return true
}

// 将一对匹配块分类为新增、删除、修改或未变化。
function classifyPair(previous?: DiffBlockModel, current?: DiffBlockModel): RenderBlock {
  if (!previous && current) return createSingleSidedBlock(current, 'added')
  if (previous && !current) return createSingleSidedBlock(previous, 'removed')
  if (!previous || !current) {
    return { kind: 'paragraph', changeType: 'unchanged' }
  }

  if (current.kind === 'horizontalRule') {
    return { kind: 'horizontalRule', changeType: 'unchanged' }
  }

  if (current.kind === 'imageBlock') {
    return classifyImageBlock(previous, current)
  }

  if (current.kind === 'taskItem') {
    return classifyTaskBlock(previous, current)
  }

  if (current.kind === 'codeBlock') {
    return classifyCodeBlock(previous, current)
  }

  if (current.kind === 'mermaidBlock') {
    return classifyMermaidBlock(previous, current)
  }

  if (['table', 'tableRow', 'columnGroup', 'column'].includes(current.kind)) {
    return classifyContainerBlock(previous, current)
  }

  const segments = buildTextDiffSegments(previous.text || '', current.text || '')
  const attrsChanged = JSON.stringify(previous.attrs || {}) !== JSON.stringify(current.attrs || {})
  const textChanged = segments.some((segment) => segment.type !== 'unchanged')

  return {
    kind: current.kind,
    changeType: textChanged || attrsChanged ? 'modified' : 'unchanged',
    text: current.text,
    attrs: current.attrs,
    segments,
  }
}

// 任务项除了文本 diff，还需要明确表达勾选状态的变化。
function classifyTaskBlock(previous: DiffBlockModel, current: DiffBlockModel): RenderBlock {
  const segments = buildTextDiffSegments(previous.text || '', current.text || '')
  const previousChecked = Boolean(previous.attrs?.checked)
  const currentChecked = Boolean(current.attrs?.checked)
  const checkedChanged = previousChecked !== currentChecked
  const textChanged = segments.some((segment) => segment.type !== 'unchanged')

  return {
    kind: 'taskItem',
    changeType: checkedChanged || textChanged ? 'modified' : 'unchanged',
    text: current.text,
    attrs: {
      ...current.attrs,
      previousChecked,
      checkedChangeType: checkedChanged ? (currentChecked ? 'checked' : 'unchecked') : 'unchanged',
    },
    segments,
  }
}

// 代码块按源码行级 diff 展示，避免字符级高亮破坏源码阅读体验。
function classifyCodeBlock(previous: DiffBlockModel, current: DiffBlockModel): RenderBlock {
  const segments = buildLineDiffSegments(previous.text || '', current.text || '')
  const textChanged = segments.some((segment) => segment.type !== 'unchanged')

  return {
    kind: 'codeBlock',
    changeType: textChanged ? 'modified' : 'unchanged',
    text: current.text,
    attrs: current.attrs,
    segments,
  }
}

// Mermaid 图块按源码行级 diff 展示，更接近 DSL/代码块的阅读方式。
function classifyMermaidBlock(previous: DiffBlockModel, current: DiffBlockModel): RenderBlock {
  const segments = buildLineDiffSegments(previous.text || '', current.text || '')
  const textChanged = segments.some((segment) => segment.type !== 'unchanged')

  return {
    kind: 'mermaidBlock',
    changeType: textChanged ? 'modified' : 'unchanged',
    text: current.text,
    segments,
  }
}

// 为单边块构建新增或删除渲染结果，保留最少必要信息。
function createSingleSidedBlock(block: DiffBlockModel, changeType: 'added' | 'removed'): RenderBlock {
  if (block.kind === 'horizontalRule') {
    return { kind: 'horizontalRule', changeType }
  }

  if (block.kind === 'imageBlock') {
    return {
      kind: 'imageBlock',
      changeType,
      attrs: block.attrs,
    }
  }

  if (block.children?.length) {
    return {
      kind: block.kind,
      changeType,
      attrs: block.attrs,
      children: block.children.map((child) => createSingleSidedBlock(child, changeType)),
    }
  }

  return {
    kind: block.kind,
    changeType,
    text: block.text,
    attrs: block.attrs,
    segments: block.text ? [{ type: changeType, text: block.text }] : [],
  }
}

// 图片块按属性变化分类，支持替换前后图片的预览对比。
function classifyImageBlock(previous: DiffBlockModel, current: DiffBlockModel): RenderBlock {
  const previousSrc = typeof previous.attrs?.src === 'string' ? previous.attrs.src : ''
  const currentSrc = typeof current.attrs?.src === 'string' ? current.attrs.src : ''
  const attrsChanged = JSON.stringify(previous.attrs || {}) !== JSON.stringify(current.attrs || {})
  const imageChangeType =
    previousSrc && currentSrc && previousSrc !== currentSrc ? 'replaced' : attrsChanged ? 'updated' : 'unchanged'

  return {
    kind: 'imageBlock',
    changeType: imageChangeType === 'unchanged' ? 'unchanged' : 'modified',
    attrs: {
      ...current.attrs,
      previousSrc,
      imageChangeType,
    },
  }
}

// 容器块递归比较子节点，保留表格和分栏的结构化预览。
function classifyContainerBlock(previous: DiffBlockModel, current: DiffBlockModel): RenderBlock {
  const children = matchBlocks(previous.children || [], current.children || []).map(
    ({ previous: previousChild, current: currentChild }) => classifyPair(previousChild, currentChild)
  )
  const attrsChanged = JSON.stringify(previous.attrs || {}) !== JSON.stringify(current.attrs || {})
  const childChanged = children.some((child) => child.changeType !== 'unchanged')

  return {
    kind: current.kind,
    changeType: attrsChanged || childChanged ? 'modified' : 'unchanged',
    attrs: current.attrs,
    children,
  }
}

// 将源码按行做 diff，适合 Mermaid 这类 DSL 预览。
function buildLineDiffSegments(previousText: string, currentText: string) {
  if (previousText === currentText) {
    return previousText ? [{ type: 'unchanged' as const, text: previousText }] : []
  }

  const previousLines = splitLines(previousText)
  const currentLines = splitLines(currentText)
  const previousLineText = previousLines.join('\n')
  const currentLineText = currentLines.join('\n')

  if (!previousLineText) {
    return currentLineText ? [{ type: 'added' as const, text: currentLineText }] : []
  }
  if (!currentLineText) {
    return [{ type: 'removed' as const, text: previousLineText }]
  }

  return buildLongestCommonSubsequenceSegments(previousLines, currentLines).map((segment) => ({
    type: segment.type,
    text: segment.lines.join('\n'),
  }))
}

// 统一拆分代码行，并去掉首尾多余空白行。
function splitLines(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .filter((line, index, array) => {
      if (line !== '') return true
      if (index === 0) return false
      if (index === array.length - 1) return false
      return true
    })
}

// 基于 LCS 生成行级 diff 片段，避免 Mermaid 源码被字符级切得太碎。
function buildLongestCommonSubsequenceSegments(previousLines: string[], currentLines: string[]) {
  const rows = previousLines.length
  const cols = currentLines.length
  const dp = Array.from({ length: rows + 1 }, () => Array<number>(cols + 1).fill(0))

  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      if (previousLines[i - 1] === currentLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const actions: Array<{ type: 'added' | 'removed' | 'unchanged'; line: string }> = []
  let i = rows
  let j = cols

  while (i > 0 && j > 0) {
    if (previousLines[i - 1] === currentLines[j - 1]) {
      actions.push({ type: 'unchanged', line: previousLines[i - 1] })
      i -= 1
      j -= 1
      continue
    }

    if (dp[i][j - 1] >= dp[i - 1][j]) {
      actions.push({ type: 'added', line: currentLines[j - 1] })
      j -= 1
      continue
    }

    actions.push({ type: 'removed', line: previousLines[i - 1] })
    i -= 1
  }

  while (i > 0) {
    actions.push({ type: 'removed', line: previousLines[i - 1] })
    i -= 1
  }

  while (j > 0) {
    actions.push({ type: 'added', line: currentLines[j - 1] })
    j -= 1
  }

  const merged: Array<{ type: 'added' | 'removed' | 'unchanged'; lines: string[] }> = []
  actions.reverse().forEach((action) => {
    const previous = merged[merged.length - 1]
    if (previous && previous.type === action.type) {
      previous.lines.push(action.line)
      return
    }
    merged.push({ type: action.type, lines: [action.line] })
  })

  return merged
}
