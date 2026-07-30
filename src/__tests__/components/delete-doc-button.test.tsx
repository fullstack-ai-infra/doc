import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import DeleteDocButton from '@/components/delete-doc-button'
import { TEST_DOC_ID } from '../utils/constants'

test('Delete doc button component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <DeleteDocButton id={TEST_DOC_ID} />
    </NextIntlClientProviderWrapper>
  )
  const button = screen.getByRole('button')
  expect(button.textContent).toBeDefined()
})
