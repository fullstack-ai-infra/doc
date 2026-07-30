import { Link } from '@/i18n/routing'
import HomeNav from '@/components/home-nav'
import SignOutButton from '@/components/sign-out-button'
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
      {/* <p>session: {JSON.stringify(session)}</p> */}
      <div className="flex flex-col items-center">
        <p className="mb-6">
          {t('haveLogin')},
          <Link href="/" className="underline ml-1">
            {t('goBackHome')}
          </Link>
        </p>
        <SignOutButton>{t('logout')}</SignOutButton>
      </div>
    </Wrapper>
  )
}

// 容器
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex justify-center items-center">
      <HomeNav />
      {children}
    </div>
  )
}
