import { expect, test, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import MoveDocButton from '@/components/move-doc-button'
import { useDocsStore } from '@/stores/docs-store'
import { TEST_DOC_ID, TEST_DOC, TEST_DOC2 } from '../utils/constants'
import mockAPI from '../utils/mock-api'

mockAPI()

beforeAll(() => {
  useDocsStore.setState({ docs: [TEST_DOC, TEST_DOC2] })
})

test('Move doc button component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <MoveDocButton id={TEST_DOC_ID} />
    </NextIntlClientProviderWrapper>
  )

  const button = screen.getByRole('button')
  expect(button).toBeDefined()

  // click button, open dialog
  fireEvent.click(button)
  const dialog = screen.getByRole('move-content')
  expect(dialog).toBeDefined()

  // select a doc as parent
  const selectedDoc = screen.getByTestId(`move-item-${TEST_DOC2.id}`)
  fireEvent.click(selectedDoc)

  // click submit button to move
  const submitButton = screen.getByRole('submit-button')
  fireEvent.click(submitButton)

  // check if the doc is moved
  await waitFor(async () => {
    const movedDoc = screen.getByTestId(`move-item-${TEST_DOC.id}`)
    expect(movedDoc.getAttribute('data-level')).toBe('2')
  })
})
