const CryptoJS = require('crypto-js')

const KEY = process.env.API_AUTH_KEY

function decryptToken(token) {
  if (!KEY || !token) return null
  const bytes = CryptoJS.AES.decrypt(token, KEY)
  const str = bytes.toString(CryptoJS.enc.Utf8)
  try {
    const info = JSON.parse(str)
    if (!info.userId || !Number.isFinite(info.dt)) return null
    const gap = Date.now() - info.dt
    if (Math.abs(gap) > 1000 * 60 * 60 * 18) {
      // greater than 18 hours
      console.error('token expired, gap: ', gap)
      return null
    }
    return info
  } catch (e) {
    return null
  }
}

module.exports = {
  decryptToken,
}
