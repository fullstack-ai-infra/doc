import { getUserInfo } from '@/lib/session'
import { db } from '@/db/db'
import { genSuccessData, genErrorData, genUnAuthData } from '../../utils/gen-res-data'
import { sendEmail } from '@/lib/mailer'

// create doc share relation
export async function POST(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  // get body
  const body = await request.json()
  const { email, access, docId, docTitle } = body

  // check email
  const userByEmail = await db.user.findUnique({ where: { email } })
  if (userByEmail == null) return Response.json(genErrorData('User not found by email 根据邮箱未找到用户'))

  const { id, name: userName } = userByEmail

  // create share relation
  try {
    const shareRelation = await db.shareRelation.create({
      data: {
        docId,
        authorId: user.id as string,
        userId: id,
        access,
        noticeType: 'NEW',
      },
    })

    // send email - async
    sendEmail({
      subject: `doc: "${user.name || user.email}" 分享给你一篇文档 / shared a document with you`,
      text: `Document "${docTitle}" is available at ${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}.`,
      toEmail: email,
    })

    return Response.json(genSuccessData({ shareRelation, userName }))
  } catch (err) {
    console.log('Create share relation error ', err)
    return Response.json(genErrorData('Something went wrong, try again please.'))
  }
}

// delete share relation
export async function DELETE(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  // get id from request body
  const body = await request.json()
  const { id, docTitle, email } = body

  // delete from db
  try {
    await db.shareRelation.delete({
      where: { id },
    })

    // send email - async
    sendEmail({
      subject: `doc: "${user.name}" 取消了文档分享 / canceled a document share`,
      text: `Document "${docTitle}" is no longer shared with you.`,
      toEmail: email,
    })

    return Response.json(genSuccessData())
  } catch (err) {
    console.log('Delete share relation error ', err)
    return Response.json(genErrorData('Something went wrong, try again please.'))
  }
}

export async function PATCH(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  // get body
  const body = await request.json()
  const { id, noticeType } = body

  // update db
  try {
    await db.shareRelation.update({
      where: { id },
      data: { noticeType },
    })
    return Response.json(genSuccessData())
  } catch (err) {
    console.log('Update share relation error ', err)
    return Response.json(genErrorData('Something went wrong, try again please.'))
  }
}
