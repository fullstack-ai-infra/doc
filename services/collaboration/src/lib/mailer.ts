import 'dotenv/config'

import nodemailer, { type SentMessageInfo } from 'nodemailer'

const config = {
  host: process.env.EMAIL_HOST,
  port: Number.parseInt(process.env.EMAIL_PORT || '', 10),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
}
const transporter = nodemailer.createTransport(config)

export interface CollaborationEmail {
  subject?: string
  text?: string
}

export async function sendEmail(opt: CollaborationEmail = {}): Promise<SentMessageInfo | undefined> {
  const { subject = '', text = '' } = opt
  if (!subject) {
    console.error('subject required')
    return
  }

  const mailConfig = {
    from: `doc<${process.env.EMAIL_USER}>`,
    subject,
    to: process.env.EMAIL_TO,
    text,
  }
  const res = await transporter.sendMail(mailConfig)
  console.log('Message sent: %s', res.messageId)
  return res
}
