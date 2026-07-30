const pg = require('pg')
const { sendEmail } = require('../lib/mailer')
require('dotenv').config()

const { Pool } = pg
const url = process.env.DATABASE_URL

const pgClient = new Pool({
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

async function connect() {
  await pgClient.query('select 1')
  console.log('doc collaboration database ready')
}

async function reconnect() {
  // pg.Pool replaces failed idle clients automatically. A probe makes the
  // current failure visible while allowing the next request to retry cleanly.
  try {
    await connect()
  } catch (error) {
    console.error('doc collaboration database probe failed', error)
  }
}

module.exports = { pgClient, connect, reconnect }
