import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../messages/en.json'

export default function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider messages={messages} locale="en">
      {children}
    </NextIntlClientProvider>
  )
}
