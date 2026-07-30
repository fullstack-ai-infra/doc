import { expect, test } from 'vitest'
import mockAPI from '../utils/mock-api'
import { get, post, patch, del } from '@/lib/ajax'
import { TEST_DOC_ID, TEST_DOC, TEST_DOC2 } from '../utils/constants'

mockAPI()

test('ajax get function', async () => {
  const res = await get(`api/doc/${TEST_DOC_ID}`)
  expect(res.errno).toBe(0)
  expect(res.data).toEqual(TEST_DOC)
})

test('ajax post function', async () => {
  const res = await post(`/api/doc`, TEST_DOC2)
  expect(res.errno).toBe(0)
  expect(res.data).toEqual(TEST_DOC2)
})

test('ajax patch function', async () => {
  const res = await patch(`/api/doc/${TEST_DOC_ID}`, { title: 'doc2' })
  expect(res.errno).toBe(0)
})

test('ajax del function', async () => {
  const res = await del(`/api/doc`, { ids: ['doc1', 'doc2'] })
  expect(res.errno).toBe(0)
})
