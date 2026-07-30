import 'server-only'

import { Prisma, PubDocStatus } from '@prisma/client'
import { db } from '@/db/db'
import {
  AdminDocDeleteStatus,
  AdminDocPublishStatus,
  adminDocDeleteStatusOptions,
  adminDocPublishStatusOptions,
} from '@/lib/admin-filters'

export type AdminDocsQuery = {
  q?: string
  author?: string
  deleteStatus?: string
  publishStatus?: string
  page?: string
}

export type AdminUsersQuery = {
  q?: string
  page?: string
}

export const adminListPageSize = 10

function normalizeAdminPage(page?: string) {
  const value = Number(page)
  if (!Number.isInteger(value) || value < 1) {
    return 1
  }
  return value
}

export function normalizeAdminDocsQuery(query: AdminDocsQuery) {
  const q = query.q?.trim() || ''
  const author = query.author?.trim() || ''
  const deleteStatus = adminDocDeleteStatusOptions.includes(query.deleteStatus as AdminDocDeleteStatus)
    ? (query.deleteStatus as AdminDocDeleteStatus)
    : 'all'
  const publishStatus = adminDocPublishStatusOptions.includes(query.publishStatus as AdminDocPublishStatus)
    ? (query.publishStatus as AdminDocPublishStatus)
    : 'all'
  const page = normalizeAdminPage(query.page)

  return { q, author, deleteStatus, publishStatus, page }
}

export function normalizeAdminUsersQuery(query: AdminUsersQuery) {
  return {
    q: query.q?.trim() || '',
    page: normalizeAdminPage(query.page),
  }
}

export async function getAdminOverview() {
  const [docCount, publishedCount, userCount, adminCount] = await Promise.all([
    db.doc.count(),
    db.pubDoc.count({ where: { status: PubDocStatus.PUBLISHED } }),
    db.user.count(),
    db.user.count({ where: { isAdmin: true } }),
  ])

  return {
    docCount,
    publishedCount,
    userCount,
    adminCount,
  }
}

export async function getAdminDocs(query: AdminDocsQuery) {
  const normalized = normalizeAdminDocsQuery(query)
  const where: Prisma.DocWhereInput = {}

  if (normalized.q) {
    where.title = {
      contains: normalized.q,
      mode: 'insensitive',
    }
  }

  if (normalized.author) {
    where.user = {
      OR: [
        {
          name: {
            contains: normalized.author,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: normalized.author,
            mode: 'insensitive',
          },
        },
      ],
    }
  }

  if (normalized.deleteStatus === 'active') {
    where.isDeleted = false
  } else if (normalized.deleteStatus === 'deleted') {
    where.isDeleted = true
  }

  if (normalized.publishStatus === 'published') {
    where.pubDoc = {
      some: {
        status: PubDocStatus.PUBLISHED,
      },
    }
  } else if (normalized.publishStatus === 'frozen') {
    where.pubDoc = {
      some: {
        status: PubDocStatus.FROZEN,
      },
    }
  } else if (normalized.publishStatus === 'unpublished') {
    where.pubDoc = {
      some: {
        status: PubDocStatus.UNPUBLISHED,
      },
    }
  } else if (normalized.publishStatus === 'never') {
    where.pubDoc = {
      none: {},
    }
  }

  const total = await db.doc.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / adminListPageSize))
  const page = Math.min(normalized.page, totalPages)

  const list = await db.doc.findMany({
    where,
    orderBy: {
      updatedAt: 'desc',
    },
    skip: (page - 1) * adminListPageSize,
    take: adminListPageSize,
    select: {
      id: true,
      title: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      pubDoc: {
        orderBy: {
          updatedAt: 'desc',
        },
        take: 1,
        select: {
          publishId: true,
          status: true,
          statusReason: true,
          statusUpdatedAt: true,
          statusUpdatedBy: true,
          updatedAt: true,
        },
      },
    },
  })

  return {
    filters: {
      ...normalized,
      page,
    },
    items: list.map((item) => ({
      ...item,
      latestPubDoc: item.pubDoc[0] || null,
      isPublished: item.pubDoc.some((pub) => pub.status === PubDocStatus.PUBLISHED),
    })),
    pagination: {
      page,
      pageSize: adminListPageSize,
      total,
      totalPages,
    },
  }
}

export async function updateAdminDocDeleteStatus(id: string, isDeleted: boolean) {
  return db.doc.update({
    where: { id },
    data: { isDeleted },
    select: {
      id: true,
      isDeleted: true,
    },
  })
}

export async function getAdminUsers(query: AdminUsersQuery) {
  const normalized = normalizeAdminUsersQuery(query)
  const where: Prisma.UserWhereInput = {}

  if (normalized.q) {
    where.OR = [
      {
        name: {
          contains: normalized.q,
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: normalized.q,
          mode: 'insensitive',
        },
      },
    ]
  }

  const total = await db.user.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / adminListPageSize))
  const page = Math.min(normalized.page, totalPages)

  const items = await db.user.findMany({
    where,
    orderBy: {
      emailVerified: 'desc',
    },
    skip: (page - 1) * adminListPageSize,
    take: adminListPageSize,
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      isAdmin: true,
      _count: {
        select: {
          docs: true,
        },
      },
    },
  })

  return {
    filters: {
      ...normalized,
      page,
    },
    items,
    pagination: {
      page,
      pageSize: adminListPageSize,
      total,
      totalPages,
    },
  }
}

export async function updateAdminUserRole(userId: string, isAdmin: boolean) {
  const target = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isAdmin: true,
    },
  })

  if (target == null) {
    throw new Error('用户不存在')
  }

  if (target.isAdmin && !isAdmin) {
    const adminCount = await db.user.count({
      where: { isAdmin: true },
    })
    if (adminCount <= 1) {
      throw new Error('至少保留一名管理员')
    }
  }

  return db.user.update({
    where: { id: userId },
    data: { isAdmin },
    select: {
      id: true,
      isAdmin: true,
    },
  })
}
