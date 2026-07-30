export interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged'
  text: string
}

const MAX_DIFF_MATRIX_SIZE = 12000

// 将版本正文 JSON 提取成纯文本，供右侧差异预览先做轻量展示。
export function extractPlainText(content: string) {
  try {
    const doc = JSON.parse(content)
    const texts: string[] = []
    walkNode(doc, texts)
    return texts
      .join('\n')
      .replace(/\n{2,}/g, '\n')
      .trim()
  } catch (ex) {
    return content
  }
}

// 构建标题或正文的轻量文本 diff 分段，优先保证可读性和稳定性。
export function buildTextDiffSegments(previousText: string, currentText: string): DiffSegment[] {
  if (previousText === currentText) {
    return previousText ? [{ type: 'unchanged', text: previousText }] : []
  }

  const previousChars = Array.from(previousText)
  const currentChars = Array.from(currentText)
  const prefixLength = getCommonPrefixLength(previousChars, currentChars)
  const suffixLength = getCommonSuffixLength(previousChars, currentChars, prefixLength)

  const prefix = previousChars.slice(0, prefixLength).join('')
  const previousMiddleChars = previousChars.slice(prefixLength, previousChars.length - suffixLength)
  const currentMiddleChars = currentChars.slice(prefixLength, currentChars.length - suffixLength)
  const suffix = suffixLength > 0 ? currentChars.slice(currentChars.length - suffixLength).join('') : ''

  const middleSegments = buildMiddleSegments(previousMiddleChars, currentMiddleChars)
  return compactSegments([
    prefix ? { type: 'unchanged', text: prefix } : null,
    ...middleSegments,
    suffix ? { type: 'unchanged', text: suffix } : null,
  ])
}

// 递归提取文本节点内容，并在常见块节点之间补换行。
function walkNode(node: any, texts: string[]) {
  if (!node) return
  if (node.type === 'text' && node.text) {
    texts.push(node.text)
    return
  }

  if (Array.isArray(node.content)) {
    node.content.forEach((child: any) => walkNode(child, texts))
    if (['paragraph', 'heading', 'blockquote', 'listItem', 'codeBlock'].includes(node.type)) {
      texts.push('\n')
    }
  }
}

// 计算两个字符数组的公共前缀长度，尽量缩小后续 diff 范围。
function getCommonPrefixLength(previousChars: string[], currentChars: string[]) {
  let index = 0
  const minLength = Math.min(previousChars.length, currentChars.length)
  while (index < minLength && previousChars[index] === currentChars[index]) {
    index += 1
  }
  return index
}

// 计算两个字符数组的公共后缀长度，避免长文本整体进入 LCS 计算。
function getCommonSuffixLength(previousChars: string[], currentChars: string[], prefixLength: number) {
  let index = 0
  const previousRemain = previousChars.length - prefixLength
  const currentRemain = currentChars.length - prefixLength
  const maxLength = Math.min(previousRemain, currentRemain)

  while (
    index < maxLength &&
    previousChars[previousChars.length - 1 - index] === currentChars[currentChars.length - 1 - index]
  ) {
    index += 1
  }

  return index
}

// 对中间变化片段做字符级 diff，过长时退化为整段增删展示。
function buildMiddleSegments(previousChars: string[], currentChars: string[]) {
  if (previousChars.length === 0 && currentChars.length === 0) return []
  if (previousChars.length === 0) return [{ type: 'added', text: currentChars.join('') } satisfies DiffSegment]
  if (currentChars.length === 0) return [{ type: 'removed', text: previousChars.join('') } satisfies DiffSegment]

  if (previousChars.length * currentChars.length > MAX_DIFF_MATRIX_SIZE) {
    return compactSegments([
      { type: 'removed', text: previousChars.join('') },
      { type: 'added', text: currentChars.join('') },
    ])
  }

  const actions = buildLcsActions(previousChars, currentChars)
  return compactSegments(
    actions.map((action) => ({
      type: action.type,
      text: action.char,
    }))
  )
}

// 基于 LCS 回溯生成字符级增删改动作。
function buildLcsActions(previousChars: string[], currentChars: string[]) {
  const rows = previousChars.length
  const cols = currentChars.length
  const dp = Array.from({ length: rows + 1 }, () => Array<number>(cols + 1).fill(0))

  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      if (previousChars[i - 1] === currentChars[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const actions: Array<{ type: DiffSegment['type']; char: string }> = []
  let i = rows
  let j = cols

  while (i > 0 && j > 0) {
    if (previousChars[i - 1] === currentChars[j - 1]) {
      actions.push({ type: 'unchanged', char: previousChars[i - 1] })
      i -= 1
      j -= 1
      continue
    }

    if (dp[i][j - 1] >= dp[i - 1][j]) {
      actions.push({ type: 'added', char: currentChars[j - 1] })
      j -= 1
      continue
    }

    actions.push({ type: 'removed', char: previousChars[i - 1] })
    i -= 1
  }

  while (i > 0) {
    actions.push({ type: 'removed', char: previousChars[i - 1] })
    i -= 1
  }

  while (j > 0) {
    actions.push({ type: 'added', char: currentChars[j - 1] })
    j -= 1
  }

  return actions.reverse()
}

// 合并相邻同类型分段，避免渲染出大量碎片 span。
function compactSegments(segments: Array<DiffSegment | null>) {
  const result: DiffSegment[] = []

  segments.forEach((segment) => {
    if (!segment || !segment.text) return
    const previous = result[result.length - 1]
    if (previous && previous.type === segment.type) {
      previous.text += segment.text
      return
    }
    result.push({ ...segment })
  })

  return result
}
