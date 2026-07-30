import 'server-only'

import { TiptapTransformer } from '@hocuspocus/transformer'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import * as Y from 'yjs'
import { EDITOR_CHARACTER_LIMIT } from '@/constants'
import { ApiV1Error } from '@/lib/api-v1'

const MAX_CONTENT_NODES = 10_000
const MAX_CONTENT_DEPTH = 64
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const SAFE_TEXT_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify'])
const SAFE_ORDERED_LIST_TYPES = new Set(['1', 'a', 'A', 'i', 'I'])
const SAFE_REL_TOKENS = new Set(['noopener', 'noreferrer', 'nofollow'])
const SAFE_HIGHLIGHT_COLOR = /^(?:#[0-9a-f]{3,8}|red)$/i
const SAFE_CODE_LANGUAGE = /^[A-Za-z0-9_+.-]{1,64}$/

const basicExtensions = [
  StarterKit.configure({
    history: false,
  }),
  Underline,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Subscript,
  Superscript,
  Highlight.configure({ multicolor: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Link.configure({ openOnClick: false }),
]

export const EMPTY_TIPTAP_DOCUMENT = {
  type: 'doc',
  content: [{ type: 'paragraph', attrs: { textAlign: 'left' } }],
}

interface ContentStats {
  nodes: number
  characters: number
}

function validateLink(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new ApiV1Error(422, 'invalid_content', 'Link href is invalid')
  }
  if ((value.startsWith('/') && !value.startsWith('//')) || value.startsWith('#')) return

  try {
    const url = new URL(value)
    if (!SAFE_LINK_PROTOCOLS.has(url.protocol)) {
      throw new ApiV1Error(422, 'invalid_content', 'Link protocol is not allowed')
    }
  } catch (error) {
    if (error instanceof ApiV1Error) throw error
    throw new ApiV1Error(422, 'invalid_content', 'Link href is invalid')
  }
}

function readAttributes(value: unknown, type: string) {
  if (value === undefined) return {}
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiV1Error(422, 'invalid_content', `${type} attributes are invalid`)
  }
  return value as Record<string, unknown>
}

function assertAttributeKeys(attributes: Record<string, unknown>, allowed: string[], type: string) {
  if (Object.keys(attributes).some((key) => !allowed.includes(key))) {
    throw new ApiV1Error(422, 'invalid_content', `${type} contains unsupported attributes`)
  }
}

function validateNodeAttributes(node: Record<string, unknown>) {
  const type = String(node.type)
  const attributes = readAttributes(node.attrs, type)

  if (type === 'paragraph') {
    assertAttributeKeys(attributes, ['textAlign'], type)
    if (
      attributes.textAlign !== undefined &&
      attributes.textAlign !== null &&
      (typeof attributes.textAlign !== 'string' || !SAFE_TEXT_ALIGNMENTS.has(attributes.textAlign))
    ) {
      throw new ApiV1Error(422, 'invalid_content', 'paragraph text alignment is invalid')
    }
    return
  }

  if (type === 'heading') {
    assertAttributeKeys(attributes, ['level', 'textAlign'], type)
    if (
      attributes.level !== undefined &&
      (!Number.isInteger(attributes.level) || Number(attributes.level) < 1 || Number(attributes.level) > 6)
    ) {
      throw new ApiV1Error(422, 'invalid_content', 'heading level is invalid')
    }
    if (
      attributes.textAlign !== undefined &&
      attributes.textAlign !== null &&
      (typeof attributes.textAlign !== 'string' || !SAFE_TEXT_ALIGNMENTS.has(attributes.textAlign))
    ) {
      throw new ApiV1Error(422, 'invalid_content', 'heading text alignment is invalid')
    }
    return
  }

  if (type === 'orderedList') {
    assertAttributeKeys(attributes, ['start', 'type'], type)
    if (
      attributes.start !== undefined &&
      (!Number.isInteger(attributes.start) || Number(attributes.start) < 1 || Number(attributes.start) > 1_000_000)
    ) {
      throw new ApiV1Error(422, 'invalid_content', 'ordered list start is invalid')
    }
    if (
      attributes.type !== undefined &&
      attributes.type !== null &&
      (typeof attributes.type !== 'string' || !SAFE_ORDERED_LIST_TYPES.has(attributes.type))
    ) {
      throw new ApiV1Error(422, 'invalid_content', 'ordered list type is invalid')
    }
    return
  }

  if (type === 'codeBlock') {
    assertAttributeKeys(attributes, ['language'], type)
    if (
      attributes.language !== undefined &&
      attributes.language !== null &&
      (typeof attributes.language !== 'string' || !SAFE_CODE_LANGUAGE.test(attributes.language))
    ) {
      throw new ApiV1Error(422, 'invalid_content', 'code block language is invalid')
    }
    return
  }

  if (type === 'taskItem') {
    assertAttributeKeys(attributes, ['checked'], type)
    if (attributes.checked !== undefined && typeof attributes.checked !== 'boolean') {
      throw new ApiV1Error(422, 'invalid_content', 'task item state is invalid')
    }
    return
  }

  if (
    ['doc', 'text', 'blockquote', 'bulletList', 'listItem', 'hardBreak', 'horizontalRule', 'taskList'].includes(type)
  ) {
    assertAttributeKeys(attributes, [], type)
  }
}

function validateMark(mark: Record<string, unknown>) {
  if (typeof mark.type !== 'string' || mark.type.length === 0) {
    throw new ApiV1Error(422, 'invalid_content', 'TipTap mark type is invalid')
  }
  const attributes = readAttributes(mark.attrs, `${mark.type} mark`)

  if (mark.type === 'link') {
    assertAttributeKeys(attributes, ['href', 'target', 'rel', 'class'], 'link mark')
    validateLink(attributes.href)
    if (
      attributes.target !== undefined &&
      attributes.target !== null &&
      attributes.target !== '_blank' &&
      attributes.target !== '_self'
    ) {
      throw new ApiV1Error(422, 'invalid_content', 'Link target is invalid')
    }
    if (attributes.rel !== undefined && attributes.rel !== null) {
      if (
        typeof attributes.rel !== 'string' ||
        attributes.rel
          .split(/\s+/)
          .filter(Boolean)
          .some((token) => !SAFE_REL_TOKENS.has(token))
      ) {
        throw new ApiV1Error(422, 'invalid_content', 'Link rel is invalid')
      }
    }
    if (attributes.class !== undefined && attributes.class !== null) {
      throw new ApiV1Error(422, 'invalid_content', 'Link class is not supported')
    }
    return
  }

  if (mark.type === 'highlight') {
    assertAttributeKeys(attributes, ['color'], 'highlight mark')
    if (
      attributes.color !== undefined &&
      attributes.color !== null &&
      (typeof attributes.color !== 'string' || !SAFE_HIGHLIGHT_COLOR.test(attributes.color))
    ) {
      throw new ApiV1Error(422, 'invalid_content', 'Highlight color is invalid')
    }
    return
  }

  if (['bold', 'italic', 'strike', 'code', 'underline', 'subscript', 'superscript'].includes(mark.type)) {
    assertAttributeKeys(attributes, [], `${mark.type} mark`)
  }
}

function inspectContentNode(value: unknown, depth: number, stats: ContentStats) {
  if (depth > MAX_CONTENT_DEPTH || value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiV1Error(422, 'invalid_content', 'TipTap content has an invalid node structure')
  }

  const node = value as Record<string, unknown>
  if (typeof node.type !== 'string' || node.type.length === 0) {
    throw new ApiV1Error(422, 'invalid_content', 'Every TipTap node must have a type')
  }
  validateNodeAttributes(node)

  stats.nodes += 1
  if (stats.nodes > MAX_CONTENT_NODES) {
    throw new ApiV1Error(422, 'invalid_content', `TipTap content must not exceed ${MAX_CONTENT_NODES} nodes`)
  }

  if (node.type === 'text') {
    if (typeof node.text !== 'string') {
      throw new ApiV1Error(422, 'invalid_content', 'TipTap text nodes must contain text')
    }
    stats.characters += node.text.length
    if (stats.characters > EDITOR_CHARACTER_LIMIT) {
      throw new ApiV1Error(
        422,
        'invalid_content',
        `TipTap content must not exceed ${EDITOR_CHARACTER_LIMIT} characters`
      )
    }
  }

  if (node.marks !== undefined) {
    if (!Array.isArray(node.marks)) {
      throw new ApiV1Error(422, 'invalid_content', 'TipTap marks must be an array')
    }
    for (const mark of node.marks) {
      if (mark == null || typeof mark !== 'object' || Array.isArray(mark)) {
        throw new ApiV1Error(422, 'invalid_content', 'TipTap mark is invalid')
      }
      validateMark(mark as Record<string, unknown>)
    }
  }

  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) {
      throw new ApiV1Error(422, 'invalid_content', 'TipTap child content must be an array')
    }
    for (const child of node.content) inspectContentNode(child, depth + 1, stats)
  }
}

export function encodeTiptapDocument(value: unknown) {
  if (
    value == null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (value as Record<string, unknown>).type !== 'doc'
  ) {
    throw new ApiV1Error(422, 'invalid_content', 'TipTap content must have a doc root')
  }

  inspectContentNode(value, 0, { nodes: 0, characters: 0 })

  try {
    const ydoc = TiptapTransformer.toYdoc(value, 'default', basicExtensions)
    const canonical = TiptapTransformer.fromYdoc(ydoc, 'default')
    return {
      content: canonical,
      contentJson: JSON.stringify(canonical),
      contentBinary: Buffer.from(Y.encodeStateAsUpdate(ydoc)),
    }
  } catch {
    throw new ApiV1Error(
      422,
      'unsupported_content',
      'TipTap content contains an invalid or unsupported node for API creation'
    )
  }
}
