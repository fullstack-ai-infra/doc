'use client'

export default function UpdateTime({ dt }: { dt: Date }) {
  // 在客户端显示时间，服务端时区可能不同
  return <span className="text-gray-500">{dt.toLocaleString()}</span>
}
