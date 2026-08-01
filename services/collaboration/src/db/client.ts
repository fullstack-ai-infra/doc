import 'dotenv/config'

import { Pool } from 'pg'
import { sendEmail } from '../lib/mailer.js'
import { errorMessage } from '../lib/error.js'
const url = process.env.DATABASE_URL

export const pgClient = new Pool({
  connectionString: url,
  max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
})

pgClient.on('error', (err) => {
  console.error('doc collaboration database error', err.stack)

  sendEmail({
    subject: 'doc collaboration database error',
    text: err.message || 'error',
  })
})

export async function connect(): Promise<void> {
  await pgClient.query('select 1')
  console.log('doc collaboration database ready')
}

export async function reconnect(): Promise<void> {
  // pg.Pool replaces failed idle clients automatically. A probe makes the
  // current failure visible while allowing the next request to retry cleanly.
  try {
    await connect()
  } catch (error) {
    console.error('doc collaboration database probe failed')
    void errorMessage(error)
  }
}
