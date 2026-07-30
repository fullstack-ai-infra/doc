const pg = require('pg')
require('dotenv').config()

const { Client } = pg
const url = process.env.DATABASE_URL

async function main() {
  // console.log('url...', url)
  const client = new Client(url)

  client.on('error', (err) => {
    console.error('something bad has happened!', err.stack)
  })

  await client.connect()

  // const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` // list all tables

  // // ----------------- select list -----------------
  // const sql = `select id, title from "Doc" order by "Doc"."createdAt" desc limit 10`
  // const result = await client.query(sql)
  // console.log(result.rows)

  // // ----------------- select one -----------------
  // const sql = `select id, title, "contentBinary" from "Doc" where id = '0b6e5bf0-028d-4a12-8d8b-045b95f2a49d'`
  // const result = await client.query(sql)
  // console.log(result.rows[0])

  // // ----------------- select one with params -----------------
  // const sql = `select id, title, "contentBinary" from "Doc" where id = $1`
  // const params = ['0b6e5bf0-028d-4a12-8d8b-045b95f2a49d']
  // const result = await client.query(sql, params)
  // console.log(result.rows[0])

  // // ----------------- update -----------------
  // const sql = `update "Doc" set title = 't2-x' where id = '981c984b-69bd-4aff-9cde-b9bc4165a516'`
  // const result = await client.query(sql)
  // console.log(result.rowCount)

  // // ----------------- update with params -----------------
  // const sql = `update "Doc" set title = $1 where id = $2`
  // const params = ['t1-x', '5e021f72-70e6-4115-ad77-c4a832226b5c']
  // const result = await client.query(sql, params)
  // console.log(result.rowCount)

  await client.end()
}

main()
