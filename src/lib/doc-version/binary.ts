// 把协同正文二进制状态编码为便于接口传输的 base64 字符串。
export function uint8ArrayToBase64(data: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64')
  }

  let binary = ''
  data.forEach((item) => {
    binary += String.fromCharCode(item)
  })
  return btoa(binary)
}

// 把接口中的 base64 字符串还原为协同正文二进制状态。
export function base64ToUint8Array(base64: string) {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64, 'base64'))
  }

  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
