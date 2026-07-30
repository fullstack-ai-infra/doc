import { expect, test } from 'vitest'
import { timeAgo, isOneWeekAgo, isSameMonth } from '@/lib/dt'

test('dt timeAgo function', () => {
  const res1 = timeAgo('2023-1-1', true, new Date('2025-2-2'))
  expect(res1).toBe('2 年前')

  const res2 = timeAgo('2024-10-1', true, new Date('2025-2-2'))
  expect(res2).toBe('4 个月前')

  const res3 = timeAgo('2025-1-10', true, new Date('2025-2-2'))
  expect(res3).toBe('23 天前')

  const res4 = timeAgo('2025-2-2 7:05:00', true, new Date('2025-2-2 10:10:00'))
  expect(res4).toBe('3 小时前')

  const res5 = timeAgo('2025-2-2 10:05:00', true, new Date('2025-2-2 10:10:00'))
  expect(res5).toBe('5 分钟前')

  const res6 = timeAgo('2025-2-2 10:09:10', true, new Date('2025-2-2 10:10:00'))
  expect(res6).toBe('50 秒前')

  const res7 = timeAgo('2025-2-2 10:10:10', true, new Date('2025-2-2 10:10:00'))
  expect(res7).toBe('刚刚')
})

test('dt isOneWeekAgo function', () => {
  const res1 = isOneWeekAgo(new Date('2025-1-1'), new Date('2025-1-10'))
  expect(res1).toBeTruthy()

  const res2 = isOneWeekAgo(new Date('2025-1-7'), new Date('2025-1-10'))
  expect(res2).toBeFalsy()
})

test('dt isSameMonth function', () => {
  const res1 = isSameMonth(new Date('2025-1-1'), new Date('2025-1-10'))
  expect(res1).toBeTruthy()

  const res2 = isSameMonth(new Date('2024-1-1'), new Date('2025-1-10'))
  expect(res2).toBeFalsy()
})
