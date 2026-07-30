import { expect, test, afterAll, afterEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import StarDocButton from '@/components/star-doc-button'
import { useDocsStore } from '@/stores/docs-store'
import { TEST_DOC, TEST_DOC_ID } from '../utils/constants'
import mockAPI from '../utils/mock-api'

mockAPI()

beforeAll(() => {
  useDocsStore.setState({ docs: [TEST_DOC] })
})

test('Star doc button component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <StarDocButton id={TEST_DOC_ID} />
    </NextIntlClientProviderWrapper>
  )

  const button = screen.getByRole('button')
  expect(button.textContent).toBe('Favorite')

  // click button
  fireEvent.click(button)
  await waitFor(() => {
    expect(button.textContent).toBe('Favorited')
  })
})
