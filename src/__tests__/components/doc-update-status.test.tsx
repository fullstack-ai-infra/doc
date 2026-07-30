import { expect, test, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import DocUpdateStatus from '@/components/doc-update-status'
import { TEST_DOC_ID, TEST_USER1, TEST_USER2 } from '../utils/constants'
import { useEditorStore } from '@/stores/editor-store'

const CHAR_COUNT = 101
const WORD_COUNT = 9

beforeAll(() => {
  useEditorStore.setState({
    docId: TEST_DOC_ID,
    characterCount: CHAR_COUNT,
    wordCount: WORD_COUNT,
    collaborativeState: 'connected',
    collaborativeUsers: [
      { ...TEST_USER1, clientId: 'x1', avatar: '' },
      { ...TEST_USER2, clientId: 'x2', avatar: '' },
    ],
    AITokenLimit: 0,
  })
})

test('Doc update status component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <DocUpdateStatus id={TEST_DOC_ID} />
    </NextIntlClientProviderWrapper>
  )

  const users = screen.getByRole('collaborative-users')
  expect(users.children).toHaveLength(2)
  expect(users.children[0].textContent).toContain(TEST_USER1.name[0]) // Avatar only show the first letter
  expect(users.children[1].textContent).toContain(TEST_USER2.name[0])

  const state = screen.getByRole('collaborative-state')
  expect(state.getAttribute('data-title')).toBe('connected')

  // const charCount = screen.getByRole('char-count')
  // expect(charCount.textContent).toContain(CHAR_COUNT.toString())
  // expect(charCount.textContent).toContain(WORD_COUNT.toString())
})
