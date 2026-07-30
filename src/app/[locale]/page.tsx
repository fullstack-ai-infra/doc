import {
  ArrowRight,
  Bot,
  Braces,
  Check,
  FileText,
  GitBranch,
  History,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import ChangeLocale from '@/components/change-locale'
import ChangeTheme from '@/components/change-theme'
import Logo from '@/components/logo-component'
import SignInButton from '@/components/sign-in-button'
import StartButton from '@/components/start-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUserInfo } from '@/lib/session'

const capabilities = [
  { icon: FileText, title: 'documentManagement', description: 'documentManagementDesc' },
  { icon: Users, title: 'collab', description: 'collabDesc' },
  { icon: Bot, title: 'AIGenText', description: 'AIGenTextDesc' },
  { icon: History, title: 'versionHistory', description: 'versionHistoryDesc' },
] as const

export default async function HomePage() {
  const t = await getTranslations('home')
  const user = await getUserInfo()

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="sticky top-0 z-50 h-12 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <div className="h-5 w-px bg-border" aria-hidden />
          <nav className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
            <a
              className="rounded-md px-2.5 py-1.5 transition-colors hover:bg-secondary hover:text-foreground"
              href="#capabilities"
            >
              {t('features')}
            </a>
            <a
              className="rounded-md px-2.5 py-1.5 transition-colors hover:bg-secondary hover:text-foreground"
              href="https://github.com/fullstack-ai-infra/doc"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ChangeLocale />
            <ChangeTheme />
            {user ? <StartButton size="sm" /> : <SignInButton size="sm">{t('login')}</SignInButton>}
          </div>
        </div>
      </header>

      <section className="relative border-b border-border">
        <div className="doc-grid absolute inset-0 opacity-55 [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:py-28">
          <div className="animate-fade-in">
            <Badge variant="outline" className="mb-6 gap-2 border-primary/30 bg-primary/5 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {t('eyebrow')}
            </Badge>
            <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
              {t('sloganPart1')}
              <span className="text-primary"> {t('sloganPart2')}</span>
            </h1>
            <p className="mt-6 max-w-xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
              {t('subTitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {user ? <StartButton size="lg" /> : <SignInButton size="lg">{t('getStarted')}</SignInButton>}
              <Button variant="outline" size="lg" asChild>
                <a href="#architecture">
                  {t('seeHowItWorks')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {[t('selfHosted'), t('realtime'), t('agentReady')].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-success" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-primary">01 / {t('capabilities')}</p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t('title2')}</h2>
          <p className="mt-4 leading-7 text-muted-foreground">{t('desc2')}</p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
              className="group bg-card p-6 transition-colors hover:bg-secondary/70"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="mb-8 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="font-medium">{t(title)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(description)}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="architecture" className="border-y border-border bg-card/45">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-primary">02 / {t('architecture')}</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t('title4')}</h2>
            <p className="mt-4 leading-7 text-muted-foreground">{t('architectureDesc')}</p>
          </div>
          <div className="surface grid gap-px overflow-hidden bg-border sm:grid-cols-3">
            <ArchitectureCell icon={FileText} label="UI" detail={t('uiSurface')} />
            <ArchitectureCell icon={Braces} label="API" detail={t('apiSurface')} />
            <ArchitectureCell icon={GitBranch} label="Yjs" detail={t('collabSurface')} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="surface relative overflow-hidden p-8 sm:p-12">
          <div className="doc-grid absolute inset-0 opacity-30" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-mono text-xs uppercase tracking-[0.18em]">{t('trustBoundary')}</span>
              </div>
              <h2 className="text-balance text-3xl font-semibold tracking-tight">{t('title5')}</h2>
              <p className="mt-4 leading-7 text-muted-foreground">{t('desc5')}</p>
            </div>
            {user ? <StartButton size="lg" /> : <SignInButton size="lg">{t('getStarted')}</SignInButton>}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <Logo />
            <span>· fullstack-ai-infra</span>
          </div>
          <span>{t('footer')}</span>
        </div>
      </footer>
    </main>
  )
}

function ProductPreview() {
  return (
    <div className="surface relative min-h-[430px] overflow-hidden shadow-2xl shadow-black/30 lg:rotate-[0.6deg]">
      <div className="flex h-10 items-center gap-2 border-b border-border bg-card px-3">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-destructive/70" />
          <span className="h-2 w-2 rounded-full bg-warning/70" />
          <span className="h-2 w-2 rounded-full bg-success/70" />
        </div>
        <div className="mx-auto rounded border border-border bg-secondary px-16 py-1 font-mono text-[10px] text-muted-foreground">
          /docs/product-direction
        </div>
      </div>
      <div className="grid h-[390px] grid-cols-[135px_1fr] sm:grid-cols-[175px_1fr_190px]">
        <aside className="border-r border-border bg-background/70 p-3 text-xs">
          <p className="mb-3 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Workspace</p>
          {[
            ['▾', 'Product'],
            ['  ', 'Direction'],
            ['  ', 'Architecture'],
            ['▸', 'Research'],
            ['▸', 'Decisions'],
          ].map(([mark, name], index) => (
            <div
              key={name}
              className={`mb-0.5 flex items-center gap-2 rounded px-2 py-1.5 ${
                index === 1 ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
              }`}
            >
              <span className="w-3 font-mono text-[9px] text-primary">{mark}</span>
              <span>{name}</span>
            </div>
          ))}
        </aside>
        <div className="relative overflow-hidden bg-card px-5 py-7 sm:px-9">
          <div className="mx-auto max-w-md">
            <div className="mb-5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">LIVE</span>
              <span>Saved just now</span>
              <span className="ml-auto flex -space-x-1">
                <span className="h-4 w-4 rounded border border-card bg-primary/70" />
                <span className="h-4 w-4 rounded border border-card bg-success/70" />
              </span>
            </div>
            <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">Product direction</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              A shared document surface where people and agents can write, review, and preserve decisions.
            </p>
            <div className="mt-6 space-y-3">
              {['Portable by default', 'Collaboration without lock-in', 'Every AI change remains reviewable'].map(
                (line) => (
                  <div key={line} className="flex items-center gap-2 text-xs">
                    <span className="flex h-4 w-4 items-center justify-center rounded border border-primary/40 bg-primary/10 text-primary">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {line}
                  </div>
                )
              )}
            </div>
            <div className="mt-7 rounded-md border border-primary/20 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Agent suggestion
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                Turn the portability principle into an acceptance test and link it to the architecture decision.
                <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 bg-primary animate-pulse-caret" />
              </p>
            </div>
          </div>
        </div>
        <aside className="hidden border-l border-border bg-background/70 p-3 text-xs sm:block">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Document</p>
          <PreviewMeta icon={Users} label="2 collaborators" />
          <PreviewMeta icon={History} label="18 versions" />
          <PreviewMeta icon={Share2} label="Private link" />
          <PreviewMeta icon={Search} label="Indexed" />
        </aside>
      </div>
    </div>
  )
}

function PreviewMeta({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <div className="mb-1 flex items-center gap-2 rounded px-2 py-2 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span>{label}</span>
    </div>
  )
}

function ArchitectureCell({ icon: Icon, label, detail }: { icon: typeof FileText; label: string; detail: string }) {
  return (
    <div className="bg-card p-6">
      <Icon className="mb-7 h-5 w-5 text-primary" />
      <p className="font-mono text-sm font-semibold">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}
