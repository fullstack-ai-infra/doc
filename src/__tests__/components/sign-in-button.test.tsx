import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignInButton from '@/components/sign-in-button'

test('Sign-in button component', async () => {
  render(<SignInButton>sign-in</SignInButton>)
  const link = screen.getByRole('sign-in-link')
  const href = link.getAttribute('href')
  expect(href?.startsWith('/api/auth/signin?callbackUrl=')).toBeTruthy()
})
