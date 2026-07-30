import { Link } from '@/i18n/routing'
import HomeNav from '@/components/home-nav'
import SignOutButton from '@/components/sign-out-button'
import PersonalAccessTokenManager from '@/components/personal-access-token-manager'
import { getUserInfo } from '@/lib/session'
import { getTranslations } from 'next-intl/server'

export default async function UserTestPage() {
  const user = await getUserInfo()
  const t = await getTranslations('userInfo')

  if (user == null)
    return (
      <Wrapper>
        {/* <SignInButton /> */}
        <Link href="/" className="underline text-xl">
          {t('goBackHome')}, {t('login')}
        </Link>
      </Wrapper>
    )

  return (
    <Wrapper>
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-24">
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('haveLogin')},
            <Link href="/" className="ml-1 underline">
              {t('goBackHome')}
            </Link>
          </p>
          <SignOutButton>{t('logout')}</SignOutButton>
        </div>
        <PersonalAccessTokenManager />
      </main>
    </Wrapper>
  )
}

// 容器
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <HomeNav />
      {children}
    </div>
  )
}
