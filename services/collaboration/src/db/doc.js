const { pgClient, reconnect } = require('./client')
const { sendEmail } = require('../lib/mailer')

/**
 * Update doc json content
 * @param {string} id doc id
 * @param {string} jsonStr json string
 * @returns {number} updated rowCount
 */
async function updateDocJsonStr(id, jsonStr) {
  try {
    const sql = `update "Doc" set content = $1, "updatedAt" = $2 where id = $3`
    const values = [jsonStr, new Date(), id]
    const result = await pgClient.query(sql, values)
    return result.rowCount
  } catch (err) {
    console.error('hocuspocus db updateDocJsonStr error ', err)
    sendEmail({
      subject: 'hocuspocus db updateDocJsonStr error',
      text: err.message || 'error',
    })
    reconnect()
    return 0
  }
}

/**
 * Update doc binary content
 * @param {string} id doc id
 * @param {binary} binary doc binary content
 * @returns {number} updated rowCount
 */
async function updateDocBinary(id, binary) {
  try {
    const sql = `update "Doc" set "contentBinary" = $1 where id = $2`
    const values = [binary, id]
    const result = await pgClient.query(sql, values)
    return result.rowCount
  } catch (err) {
    console.error('hocuspocus db updateDocBinary error ', err)
    sendEmail({
      subject: 'hocuspocus db updateDocBinary error',
      text: err.message || 'error',
    })
    reconnect()
    return 0
  }
}

/**
 * Update doc binary and json content together
 * @param {string} id doc id
 * @param {binary} binary doc binary content
 * @param {string} jsonStr json string
 * @returns {number} updated rowCount
 */
// 同时更新正文二进制和 JSON 镜像，保证恢复后的状态一致。
async function updateDocBinaryAndJson(id, binary, jsonStr) {
  try {
    const sql = `update "Doc" set "contentBinary" = $1, content = $2, "updatedAt" = $3 where id = $4`
    const values = [binary, jsonStr, new Date(), id]
    const result = await pgClient.query(sql, values)
    return result.rowCount
  } catch (err) {
    console.error('hocuspocus db updateDocBinaryAndJson error ', err)
    sendEmail({
      subject: 'hocuspocus db updateDocBinaryAndJson error',
      text: err.message || 'error',
    })
    reconnect()
    return 0
  }
}

/**
 * Get doc object by id
 * @param {string} id doc id
 * @returns {object | null} doc object or null
 */
async function getDocById(id) {
  try {
    const sql = 'select content, "contentBinary" from "Doc" where id = $1'
    const result = await pgClient.query(sql, [id])
    return result.rows[0]
  } catch (err) {
    console.error('hocuspocus db getDocById error', err)
    sendEmail({
      subject: 'hocuspocus db getDocById error',
      text: err.message || 'error',
    })
    reconnect()
    return null
  }
}

/**
 * select one doc for monitor
 * @returns {object | null} doc object or null
 */
async function selectOneDocForMonitor() {
  try {
    const sql = `select id from "Doc" limit 1`
    const result = await pgClient.query(sql)
    return result.rows[0]
  } catch (err) {
    console.error('hocuspocus db selectOneDocForMonitor error', err)
    reconnect()
    return null
  }
}

module.exports = {
  updateDocJsonStr,
  updateDocBinary,
  updateDocBinaryAndJson,
  getDocById,
  selectOneDocForMonitor,
}
