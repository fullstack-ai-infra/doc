import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomeSlogan from '@/components/home-slogan'

test('Home Slogan component', async () => {
  render(<HomeSlogan text="abc" />)
  const p = screen.getByRole('slogan')
  expect(p).toBeDefined()
})
