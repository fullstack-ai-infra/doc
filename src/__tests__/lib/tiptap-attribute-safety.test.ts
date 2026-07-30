import { describe, expect, it } from 'vitest'
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TiptapTableRow from '@tiptap/extension-table-row'
import Columns from '@/components/editor/extensions/column/Columns'
import Column from '@/components/editor/extensions/column/Column'
import Document from '@/components/editor/extensions/document'
import ImageBlock from '@/components/editor/extensions/image-block'
import MermaidBlock from '@/components/editor/extensions/mermaid'
import SafeHighlight from '@/components/editor/extensions/safe-highlight'
import SafeLink from '@/components/editor/extensions/safe-link'
import SafeTextAlign from '@/components/editor/extensions/safe-text-align'
import { Table, TableCell, TableHeader } from '@/components/editor/extensions/table'
import {
  MAX_MERMAID_CODE_CHARACTERS,
  safeColumnBorder,
  safeColumnLayout,
  safeHighlightColor,
  safeImageAlignment,
  safeImageRatio,
  safeImageSource,
  safeImageWidth,
  safeLinkHref,
  safeMermaidCode,
  safeTextAlignment,
} from '@/lib/tiptap-attribute-safety'

describe('TipTap render attribute safety', () => {
  it('allows only enumerated text alignments', () => {
    expect(safeTextAlignment('left')).toBe('left')
    expect(safeTextAlignment('left; background-image:url(https://attacker.example)')).toBeNull()
  })

  it('allows product highlight colors without arbitrary CSS', () => {
    expect(safeHighlightColor('#ffc078')).toBe('#ffc078')
    expect(safeHighlightColor('red')).toBe('red')
    expect(safeHighlightColor('red; background-image:url(https://attacker.example)')).toBeNull()
  })

  it('allows only explicit safe link protocols and local paths', () => {
    expect(safeLinkHref('https://example.com')).toBe('https://example.com')
    expect(safeLinkHref('/work/doc-1')).toBe('/work/doc-1')
    expect(safeLinkHref('//attacker.example')).toBeNull()
    expect(safeLinkHref('javascript:alert(1)')).toBeNull()
  })

  it('allows only bounded image, column, and Mermaid attributes', () => {
    expect(safeImageSource('https://assets.example/image.png')).toBe('https://assets.example/image.png')
    expect(safeImageSource('javascript:alert(1)')).toBeNull()
    expect(safeImageWidth('50%')).toBe('50%')
    expect(safeImageWidth('0%; position:fixed')).toBeNull()
    expect(safeImageRatio('1.5')).toBe(1.5)
    expect(safeImageRatio(Number.POSITIVE_INFINITY)).toBeNull()
    expect(safeImageAlignment('center')).toBe('center')
    expect(safeImageAlignment('center; position:fixed')).toBeNull()
    expect(safeColumnLayout('sidebar-left')).toBe('sidebar-left')
    expect(safeColumnLayout('two-column attacker-class')).toBeNull()
    expect(safeColumnBorder(false)).toBe(false)
    expect(safeColumnBorder('false')).toBe(true)
    expect(safeMermaidCode('x'.repeat(MAX_MERMAID_CODE_CHARACTERS + 1))).toHaveLength(MAX_MERMAID_CODE_CHARACTERS)
  })

  it('keeps malicious collaboration attributes out of rendered editor HTML', () => {
    const html = generateHTML(
      {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: {
              textAlign: 'left; background-image:url(https://attacker.example)',
            },
            content: [
              {
                type: 'text',
                text: 'unsafe style',
                marks: [
                  {
                    type: 'highlight',
                    attrs: {
                      color: 'red; background-image:url(https://attacker.example)',
                    },
                  },
                ],
              },
              {
                type: 'text',
                text: ' unsafe link',
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: 'javascript:alert(1)',
                      target: 'named-frame',
                      rel: '',
                      class: 'attacker-class',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      [
        StarterKit,
        SafeTextAlign.configure({ types: ['heading', 'paragraph'] }),
        SafeHighlight.configure({ multicolor: true }),
        SafeLink.configure({ openOnClick: false }),
      ]
    )

    expect(html).not.toContain('background-image')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('attacker-class')
    expect(html).not.toContain('named-frame')
    expect(html).toContain('href=""')
  })

  it('sanitizes collaboration-controlled block attributes in final HTML', () => {
    const html = generateHTML(
      {
        type: 'doc',
        content: [
          {
            type: 'imageBlock',
            attrs: {
              src: 'javascript:alert(1)',
              width: '0%; position:fixed; inset:0',
              ratio: '1; background-image:url(https://attacker.example)',
              align: 'center; position:fixed',
            },
          },
          {
            type: 'mermaidBlock',
            attrs: {
              code: `graph TD\n${'x'.repeat(MAX_MERMAID_CODE_CHARACTERS + 100)}`,
            },
          },
          {
            type: 'columns',
            attrs: {
              layout: 'two-column attacker-class',
              withBorder: 'false attacker-class',
            },
            content: [
              {
                type: 'column',
                attrs: { position: 'left attacker-class' },
                content: [{ type: 'paragraph' }],
              },
              {
                type: 'column',
                attrs: { position: 'right' },
                content: [{ type: 'paragraph' }],
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                      colwidth: null,
                      style: 'position:fixed;background-image:url(https://attacker.example/header)',
                    },
                    content: [{ type: 'paragraph' }],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                      colwidth: null,
                      style: 'position:fixed;background-image:url(https://attacker.example/cell)',
                    },
                    content: [{ type: 'paragraph' }],
                  },
                ],
              },
            ],
          },
        ],
      },
      [
        Document,
        Columns,
        Column,
        StarterKit.configure({ document: false }),
        ImageBlock,
        MermaidBlock,
        Table,
        TiptapTableRow,
        TableCell,
        TableHeader,
      ]
    )

    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('position:fixed')
    expect(html).not.toContain('background-image')
    expect(html).not.toContain('attacker-class')
    expect(html).toContain('style="width: 100%; margin: 0px auto;"')
    expect(html).toContain('class="layout-two-column with-border-true"')
    expect(html).toContain('data-position="right"')

    const rendered = new DOMParser().parseFromString(html, 'text/html')
    expect(rendered.querySelector<HTMLElement>('[data-type="mermaid-block"]')?.dataset.code).toHaveLength(
      MAX_MERMAID_CODE_CHARACTERS
    )
    expect(rendered.querySelector('th')?.hasAttribute('style')).toBe(false)
    expect(rendered.querySelector('td')?.hasAttribute('style')).toBe(false)
  })
})
