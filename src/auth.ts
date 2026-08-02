import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { type Adapter } from 'next-auth/adapters'
import { db } from '@/db/db'

import GitHub from 'next-auth/providers/github'
import Email from 'next-auth/providers/nodemailer'
import Resend from 'next-auth/providers/resend'
// 其他 provider 看这里 https://github.com/nextauthjs/next-auth/blob/main/apps/examples/nextjs/auth.ts

import type { NextAuthConfig } from 'next-auth'
import { resolveAuthConfiguration } from '@/lib/auth-configuration'

function genProviders() {
  const configuration = resolveAuthConfiguration()
  const providers: NextAuthConfig['providers'] = []

  if (configuration.github) providers.push(GitHub(configuration.github))
  if (configuration.smtp) providers.push(Email(configuration.smtp))
  if (configuration.resend) providers.push(Resend(configuration.resend))

  return providers
}

export const config = {
  trustHost: true,
  theme: {
    logo: '/doc-mark.svg',
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: genProviders(),
  pages: {
    signIn: '/signin',
    verifyRequest: '/signin/verify-request',
  },
  basePath: '/api/auth',
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    authorized({ request, auth }) {
      // const { pathname } = request.nextUrl
      // if (pathname.startsWith('/work/')) return !!auth // 因为 NextAuth Adapter 默认不支持 middleware，所以这里暂时不用了
      return true
    },
    jwt({ token, trigger, user }) {
      if (trigger === 'signIn') {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      // @ts-ignore
      session.user.id = token.id
      return session
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)
