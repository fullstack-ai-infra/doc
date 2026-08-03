'use client'

import { useTransition, useEffect, useState } from 'react'
import { Github } from 'lucide-react'
import { signIn, getProviders } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
// import { Link } from '@/i18n/routing'
import HomeNav from '@/components/home-nav'
import { useTranslations } from 'next-intl'

export default function SignInPage() {
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof getProviders>>>()

  useEffect(() => {
    let active = true
    getProviders()
      .then((configuredProviders) => {
        if (active) setProviders(configuredProviders)
      })
      .catch(() => {
        if (active) setProviders(null)
      })
    return () => {
      active = false
    }
  }, [])

  // get url query `callbackUrl`
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const url = urlParams.get('callbackUrl')
    if (url) {
      setCallbackUrl(decodeURIComponent(url))
    }
  }, [])

  // handle github sign in
  const [isGithubSignInPending, startGithubSignInTransition] = useTransition()
  const handleGitHubSignIn = () => {
    startGithubSignInTransition(async () => {
      await signIn('github', { callbackUrl: callbackUrl || '/' })
    })
  }

  // handle email sign in
  const [email, setEmail] = useState('')
  const [isEmailSignInPending, setIsEmailSignInPending] = useState(false)
  const emailProviderId = providers?.resend ? 'resend' : providers?.nodemailer ? 'nodemailer' : null
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      return alert('Invalid email format 邮箱格式错误')
    }
    setIsEmailSignInPending(true)
    if (!emailProviderId) {
      setIsEmailSignInPending(false)
      return
    }
    try {
      await signIn(emailProviderId, { email, callbackUrl: callbackUrl || '/' })
    } finally {
      setIsEmailSignInPending(false)
    }
  }

  function validateEmail(email: string) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return regex.test(email)
  }

  const t = useTranslations('signin')
  const hasGitHub = Boolean(providers?.github)
  const hasEmail = Boolean(emailProviderId)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <HomeNav />
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-secondary-foreground">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subTitle')}</p>
        </div>

        {/* Login Form */}
        {hasGitHub && (
          <div className="space-y-6">
            {/* GitHub Login */}
            <Button
              variant="outline"
              className="w-full h-11 text-sm font-medium border-gray-300"
              onClick={handleGitHubSignIn}
              disabled={isGithubSignInPending}
            >
              <Github className="mr-2 h-4 w-4" />
              {t('withGithub')}
            </Button>
          </div>
        )}

        {/* Divider */}
        {hasGitHub && hasEmail && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className=" bg-secondary px-2 text-gray-500">{t('others')}</span>
            </div>
          </div>
        )}

        {/* Email Login Form */}
        {hasEmail && (
          <form className="space-y-4" onSubmit={handleEmailSignIn}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                {t('email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('enterYourEmail')}
                className="h-11 border-gray-300 focus:border-gray-400 focus:ring-gray-400"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium"
              disabled={isEmailSignInPending}
            >
              {t('withEmail')}
            </Button>
          </form>
        )}

        {providers === undefined && <p className="text-center text-sm text-muted-foreground">{t('loading')}</p>}
        {providers === null || (providers !== undefined && !hasGitHub && !hasEmail) ? (
          <p role="alert" className="text-center text-sm text-destructive">
            {t('unavailable')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
