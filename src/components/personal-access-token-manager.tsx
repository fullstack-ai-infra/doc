'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Plus, ShieldX } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PersonalAccessTokenDto, PersonalAccessTokenScope } from '@/lib/personal-access-token'

type ApiError = {
  error?: {
    message?: string
  }
}

type CreatedPersonalAccessToken = PersonalAccessTokenDto & {
  token: string
}

async function readApiData<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { data?: T } & ApiError
  if (!response.ok || body.data == null) {
    throw new Error(body.error?.message || 'Request failed')
  }
  return body.data
}

export default function PersonalAccessTokenManager() {
  const t = useTranslations('personalAccessTokens')
  const locale = useLocale()
  const [tokens, setTokens] = useState<PersonalAccessTokenDto[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState('')
  const [name, setName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [readScope, setReadScope] = useState(true)
  const [writeScope, setWriteScope] = useState(false)
  const [createdToken, setCreatedToken] = useState<CreatedPersonalAccessToken | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const loadTokens = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/personal-access-tokens', {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      })
      setTokens(await readApiData<PersonalAccessTokenDto[]>(response))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadTokens()
  }, [loadTokens])

  async function createToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const scopes: PersonalAccessTokenScope[] = []
    if (readScope) scopes.push('documents:read')
    if (writeScope) scopes.push('documents:write')
    if (scopes.length === 0) {
      setError(t('scopeRequired'))
      return
    }

    setSubmitting(true)
    setError('')
    setCreatedToken(null)
    setCopied(false)
    try {
      const response = await fetch('/api/personal-access-tokens', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name,
          scopes,
          expiresInDays: Number(expiresInDays),
        }),
      })
      const created = await readApiData<CreatedPersonalAccessToken>(response)
      const { token: _rawToken, ...safeToken } = created
      setTokens((current) => [safeToken, ...current])
      setCreatedToken(created)
      setName('')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t('createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  async function copyCreatedToken() {
    if (createdToken == null || navigator.clipboard == null) return
    await navigator.clipboard.writeText(createdToken.token)
    setCopied(true)
  }

  async function revokeToken(token: PersonalAccessTokenDto) {
    if (!window.confirm(t('revokeConfirm', { name: token.name }))) return
    setRevokingId(token.id)
    setError('')
    try {
      const response = await fetch(`/api/personal-access-tokens/${encodeURIComponent(token.id)}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError
        throw new Error(body.error?.message || t('revokeFailed'))
      }
      setTokens((current) =>
        current.map((item) => (item.id === token.id ? { ...item, revokedAt: new Date().toISOString() } : item))
      )
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : t('revokeFailed'))
    } finally {
      setRevokingId('')
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <KeyRound className="size-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="grid gap-4 rounded-md border p-4" onSubmit={createToken}>
          <div className="grid gap-2">
            <Label htmlFor="pat-name">{t('name')}</Label>
            <Input
              id="pat-name"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('namePlaceholder')}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pat-expiry">{t('expiry')}</Label>
            <Input
              id="pat-expiry"
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(event.target.value)}
              required
            />
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t('scopes')}</legend>
            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <input
                className="mt-0.5 size-4"
                type="checkbox"
                checked={readScope}
                onChange={(event) => setReadScope(event.target.checked)}
              />
              <span>
                <span className="block font-medium">documents:read</span>
                <span className="text-muted-foreground">{t('readScope')}</span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <input
                className="mt-0.5 size-4"
                type="checkbox"
                checked={writeScope}
                onChange={(event) => setWriteScope(event.target.checked)}
              />
              <span>
                <span className="block font-medium">documents:write</span>
                <span className="text-muted-foreground">{t('writeScope')}</span>
              </span>
            </label>
          </fieldset>
          <Button className="w-fit" type="submit" disabled={submitting}>
            <Plus className="mr-2 size-4" />
            {submitting ? t('creating') : t('create')}
          </Button>
        </form>

        {createdToken && (
          <div className="space-y-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-4" role="status">
            <p className="font-medium">{t('createdTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('createdDescription')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label={t('tokenValue')} value={createdToken.token} readOnly />
              <Button type="button" variant="outline" onClick={copyCreatedToken}>
                {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                {copied ? t('copied') : t('copy')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreatedToken(null)}>
                {t('dismiss')}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="space-y-3">
          <h2 className="font-medium">{t('existing')}</h2>
          {loading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
          {!loading && tokens.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}
          {tokens.map((token) => {
            const expired = new Date(token.expiresAt).getTime() <= Date.now()
            const status = token.revokedAt ? 'revoked' : expired ? 'expired' : 'active'
            return (
              <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center" key={token.id}>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{token.name}</p>
                    <span className="rounded-full border px-2 py-0.5 text-xs">{t(status)}</span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{token.tokenPrefix}…</p>
                  <p className="text-xs text-muted-foreground">
                    {token.scopes.join(', ')} ·{' '}
                    {t('expiresAt', { date: dateFormatter.format(new Date(token.expiresAt)) })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={token.revokedAt != null || revokingId === token.id}
                  onClick={() => revokeToken(token)}
                >
                  <ShieldX className="mr-2 size-4" />
                  {revokingId === token.id ? t('revoking') : t('revoke')}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
