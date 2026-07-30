import { db } from '@/db/db'
import { sendEmail } from '@/lib/mailer'

export async function getDoc(id: string) {
  try {
    const doc = await db.doc.findUnique({
      where: { id, isDeleted: false },
      select: {
        title: true,
        isStar: true,
        userId: true,
      },
    })

    return doc
  } catch (err: any) {
    console.error('getDoc error: ', err)
    sendEmail({ subject: 'getDoc error', text: err.message || 'error' })
    return err
  }
}
