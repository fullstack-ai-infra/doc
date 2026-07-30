const { pgClient, reconnect } = require('./client')

/**
 * Get share relation
 * @param {string} docId doc id
 * @param {string} userId user id
 * @returns {string | null} 'ADMIN' | 'READ' | 'WRITE' | null
 */
async function getShareRelationAccess(docId, userId) {
  try {
    // check if the doc is mine
    const getDocSQL = `select id from "Doc" where id = $1 and "userId" = $2 and "isDeleted" = false`
    const getDocValues = [docId, userId]
    const getDocResult = await pgClient.query(getDocSQL, getDocValues)
    // console.log('getDocResult...', getDocResult.rowCount)
    if (getDocResult.rowCount > 0) {
      return 'ADMIN'
    }

    // If not mine, check share relation
    const getShareRelationSQL = `
      select relation.access
      from "ShareRelation" relation
      inner join "Doc" doc on doc.id = relation."docId"
      where relation."docId" = $1
        and relation."userId" = $2
        and relation."authorId" = doc."userId"
        and doc."isDeleted" = false
      limit 1
    `
    const getShareRelationValues = [docId, userId]
    const getShareRelationResult = await pgClient.query(getShareRelationSQL, getShareRelationValues)
    // console.log('getShareRelationResult...', getShareRelationResult.rows[0])
    return getShareRelationResult.rows[0]?.access || null
  } catch (err) {
    console.error('hocuspocus db getShareRelationAccess error', err)
    reconnect()
  }
}

/**
 * update share relation notice type to 'UPDATE'
 * @param {string} docId doc id
 * @param {string} userId user id
 */
async function updateShareRelationNoticeType(docId, userId) {
  const sql = `
    update "ShareRelation" relation
    set "noticeType" = 'UPDATE'
    from "Doc" doc
    where relation."docId" = $1
      and relation."userId" <> $2
      and relation."docId" = doc.id
      and relation."authorId" = doc."userId"
  `
  const values = [docId, userId]
  try {
    const res = await pgClient.query(sql, values)
  } catch (err) {
    console.error('hocuspocus db updateShareRelationNoticeType error', err)
    reconnect()
  }
}

module.exports = {
  getShareRelationAccess,
  updateShareRelationNoticeType,
}
