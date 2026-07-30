import { db } from '@/db/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return Response.json({
      service: 'doc-web',
      status: 'ok',
      checks: {
        database: 'ok',
      },
    })
  } catch {
    return Response.json(
      {
        service: 'doc-web',
        status: 'degraded',
        checks: {
          database: 'unavailable',
        },
      },
      { status: 503 }
    )
  }
}
