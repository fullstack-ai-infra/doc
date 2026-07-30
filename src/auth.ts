import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { type Adapter } from 'next-auth/adapters'
import { db } from '@/db/db'

import GitHub from 'next-auth/providers/github'
import Email from 'next-auth/providers/nodemailer'
import Resend from 'next-auth/providers/resend'
// 其他 provider 看这里 https://github.com/nextauthjs/next-auth/blob/main/apps/examples/nextjs/auth.ts

import type { NextAuthConfig } from 'next-auth'

// 拼接 SMTP 服务器地址
function genEmailSmtpPServer() {
  const from = process.env.EMAIL_FROM || ''
  const host = process.env.EMAIL_HOST || ''
  const port = process.env.EMAIL_PORT || ''
  const password = process.env.EMAIL_PASSWORD || ''

  const username = from.split('@')[0]

  const server = `smtp://${username}:${password}@${host}:${port}`
  // console.log('Email Server:', server)
  return server
}

function genProviders() {
  const env = process.env.NODE_ENV || 'development'
  const providers = []

  providers.push(GitHub)

  if (env === 'production') {
    // 线上环境使用 resend 发送邮件
    providers.push(
      Resend({
        apiKey: process.env.RESEND_API_KEY || '',
        from: process.env.EMAIL_FROM || 'no-reply@example.com',
      })
    )
  } else {
    // 开发环境使用 nodemailer 发送邮件
    providers.push(
      Email({
        server: genEmailSmtpPServer(),
        from: process.env.EMAIL_FROM,
      })
    )
  }

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
