/**
 *  时间格式化（ChatGPT 生成的）
 * @param timeString time string to format
 * @param isZhCN locale - is zh-cn
 * @param current current dateTime - unit testing needs to pass a fixed value
 * @returns 返回如 如 "1 年前"、"3 个月前"、"1 天前"、"3 小时前" 等
 */
export function timeAgo(timeString: string, isZhCN = true, current = new Date()) {
  if (!timeString) return ''

  const previous = new Date(timeString)
  const timeDifference = current.valueOf() - previous.valueOf()

  const seconds = Math.floor(timeDifference / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (years > 0) {
    return years + (isZhCN ? ' 年前' : ' years ago')
  } else if (months > 0) {
    return months + (isZhCN ? ' 个月前' : ' months ago')
  } else if (days > 0) {
    return days + (isZhCN ? ' 天前' : ' days ago')
  } else if (hours > 0) {
    return hours + (isZhCN ? ' 小时前' : ' hours ago')
  } else if (minutes > 0) {
    return minutes + (isZhCN ? ' 分钟前' : ' minutes ago')
  } else if (seconds > 0) {
    return seconds + (isZhCN ? ' 秒前' : ' seconds ago')
  } else {
    return isZhCN ? '刚刚' : 'just now'
  }
}

export function isOneWeekAgo(dt: Date, now = new Date()) {
  const diff = now.getTime() - dt.getTime()
  const oneWeek = 7 * 24 * 3600 * 1000
  return diff > oneWeek
}

export function isSameMonth(dt: Date, now = new Date()) {
  return now.getMonth() === dt.getMonth() && now.getFullYear() === dt.getFullYear()
}

export function getHourStamp() {
  const now = Date.now()
  const hourStamp = now / (60 * 60 * 1000)
  return Math.floor(hourStamp)
}
