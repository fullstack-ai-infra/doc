import { expect, test, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import ShareDocButton from '@/components/share-doc-button2'
import { TEST_DOC, TEST_DOC_ID, TEST_USER1, TEST_USER2_EMAIL } from '../utils/constants'
import { useUserStore } from '@/stores/user-store'
import { useDocsStore } from '@/stores/docs-store'
import mockAPI from '../utils/mock-api'

mockAPI()

beforeAll(async () => {
  useDocsStore.setState({ docs: [TEST_DOC] })
  useUserStore.setState({ userInfo: TEST_USER1 })
})

test('Share doc button component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <ShareDocButton id={TEST_DOC_ID} />
    </NextIntlClientProviderWrapper>
  )
  const shareButton = screen.getByRole('share-button')
  expect(shareButton.textContent).toBe('Share')

  // click button, show dialog
  fireEvent.click(shareButton)
  expect(screen.getByRole('share-content')).toBeDefined()

  // fill email and access
  const emailInput = screen.getByTestId('share-new-email-input')
  fireEvent.change(emailInput, { target: { value: TEST_USER2_EMAIL } })
  // const accessSelect = screen.getByTestId('share-new-access-select') // rendered not a select, but imitated by buttons
  // fireEvent.change(accessSelect, { target: { value: 'WRITE' } })
  const accessTrigger = screen.getByTestId('share-new-access-trigger')
  fireEvent.click(accessTrigger)
  const accessWrite = screen.getByTestId('share-new-access-write')
  fireEvent.click(accessWrite) // set access value: WRITE

  // click button, share doc
  const shareNewButton = screen.getByTestId('share-new-button')
  fireEvent.click(shareNewButton)
  await waitFor(() => {
    expect(shareButton.textContent).toBe('Shared')
  })
})
