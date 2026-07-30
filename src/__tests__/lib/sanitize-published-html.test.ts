import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  MAX_PUBLISHED_HTML_BYTES,
  MAX_PUBLISHED_MERMAID_BYTES,
  sanitizePublishedHtml,
} from '@/lib/sanitize-published-html'

describe('sanitizePublishedHtml', () => {
  it('preserves safe TipTap structure and custom block metadata', () => {
    const html = [
      '<div data-type="columns" class="layout-two-column with-border-true">',
      '<div data-type="column" data-position="left">',
      '<p style="text-align: center">Runbook</p>',
      '</div>',
      '</div>',
      '<div data-type="mermaid-block" data-code="graph TD; A--&gt;B"></div>',
      '<div style="width: 50%; margin: 0 auto">',
      '<img src="https://assets.example/runbook.png" data-width="50%" data-ratio="1.5" data-align="center" alt="Diagram">',
      '</div>',
      '<ul data-type="taskList"><li data-checked="true"><input type="checkbox" checked><p>Done</p></li></ul>',
      '<mark data-color="#ffff00" style="background-color:#ffff00">Important</mark>',
      '<a href="https://example.com" target="_blank">Reference</a>',
    ].join('')

    const result = sanitizePublishedHtml(html)

    expect(result).toContain('data-type="columns"')
    expect(result).toContain('data-position="left"')
    expect(result).toContain('data-type="mermaid-block"')
    expect(result).toContain('data-code="graph TD; A--&gt;B"')
    expect(result).toContain('src="https://assets.example/runbook.png"')
    expect(result).toContain('class="layout-two-column with-border-true"')
    expect(result).toContain('data-type="taskList"')
    expect(result).toContain('data-checked="true"')
    expect(result).toContain('data-width="50%"')
    expect(result).toContain('data-ratio="1.5"')
    expect(result).toContain('data-align="center"')
    expect(result).toContain('data-color="#ffff00"')
    expect(result).toContain('type="checkbox"')
    expect(result).toContain('disabled')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it('removes arbitrary utility classes and data attributes that can visually replace the public page', () => {
    const result = sanitizePublishedHtml(
      [
        '<div class="layout-two-column with-border-true fixed inset-0 z-50 pointer-events-auto hidden bg-white" ',
        'data-type="columns" data-layout="two-column" data-with-border="true" ',
        'data-state="open" data-evil="overlay">',
        '<p class="absolute top-0 h-screen w-screen" data-testid="spoof">Trusted-looking prompt</p>',
        '</div>',
      ].join('')
    )

    expect(result).toContain('class="layout-two-column with-border-true"')
    expect(result).toContain('data-type="columns"')
    expect(result).toContain('data-layout="two-column"')
    expect(result).toContain('data-with-border="true"')
    expect(result).not.toMatch(
      /\b(?:fixed|inset-0|z-50|pointer-events-auto|hidden|bg-white|absolute|top-0|h-screen|w-screen)\b/
    )
    expect(result).not.toMatch(/data-(?:state|evil|testid)=/)
  })

  it('removes executable markup, event handlers, unsafe URLs, and dangerous styles', () => {
    const result = sanitizePublishedHtml(
      [
        '<script>alert(1)</script>',
        '<style>body{display:none}</style>',
        '<form action="https://attacker.example"><button>Submit</button></form>',
        '<img src="javascript:alert(1)" onerror="alert(1)">',
        '<a href="javascript:alert(1)" onclick="alert(1)">click</a>',
        '<p style="background-image:url(javascript:alert(1));text-align:left">safe text</p>',
        '<svg onload="alert(1)"><script>alert(1)</script></svg>',
      ].join('')
    )

    expect(result).not.toMatch(/<script|<style|<form|<svg/i)
    expect(result).not.toMatch(/onerror|onclick|onload|javascript:|background-image/i)
    expect(result).toContain('safe text')
    expect(result).toContain('text-align:left')
  })

  it('rejects non-string and oversized publication bodies', () => {
    expect(() => sanitizePublishedHtml(null)).toThrow('must be a string')
    expect(() => sanitizePublishedHtml('x'.repeat(MAX_PUBLISHED_HTML_BYTES + 1))).toThrow('must not exceed')
    expect(() =>
      sanitizePublishedHtml(
        `<div data-type="mermaid-block" data-code="${'x'.repeat(MAX_PUBLISHED_MERMAID_BYTES + 1)}"></div>`
      )
    ).toThrow('Mermaid blocks')
  })
})
