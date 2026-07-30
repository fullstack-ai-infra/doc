import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import DuplicateDocButton from '@/components/duplicate-doc-button'
import { TEST_DOC_ID } from '../utils/constants'

test('Duplicate doc button component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <DuplicateDocButton id={TEST_DOC_ID} />
    </NextIntlClientProviderWrapper>
  )

  const button = screen.getByRole('button')
  expect(button).toBeDefined()
})
